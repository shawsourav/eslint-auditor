const fs = require('fs');
const path = require('path');
const getDirectories = dir => {
    try {
        const files = fs.readdirSync(dir);
        return files
            .map(function(file) {
                const absolutePath = path.resolve(dir, file);
                if (!path.extname(absolutePath)) {
                    return path.resolve(dir, file);
                }
            })
            .filter(Boolean);
    } catch (e) {
        return [];
    }
};

const getRules = dir => {
    if (fs.existsSync(path.resolve(dir, '.eslintrc.js'))) {
        console.log(path.resolve(dir, '.eslintrc.js'));
        const { rules } = require(path.resolve(dir, '.eslintrc.js'));
        return rules ? Object.keys(rules).map(rule => ({ count: 0, files: [], rule })) : [];
    }
    return [];
};

const iterator = (dir, rules) => {
    const subDir = getDirectories(dir);
    rules.push(...getRules(dir));
    subDir.forEach(folder => {
        if (!/node_modules/.test(folder)) {
            iterator(folder, rules);
        }
    });
    return rules;
};

const rules = iterator(__dirname, []);

const getViolations = dir => {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(function(file) {
            const absolutePath = path.resolve(dir, file);
            if (
                path.basename(absolutePath) == 'index.js' ||
                path.basename(absolutePath) == 'main.js'
            ) {
                fs.readFileSync(absolutePath, 'utf-8')
                    .split('\n')
                    .filter(Boolean)
                    .forEach(line => {
                        if (/eslint-disable/.test(line)) {
                            line.split(' ')
                                .filter(
                                    str =>
                                        str !== '' &&
                                        str != '//' &&
                                        str !== '/*' &&
                                        str !== '*/' &&
                                        !/eslint-disable/.test(str),
                                )
                                .map(el => el.replace(',', ''))
                                .forEach(el => {
                                    const index = rules.findIndex(rule => rule['rule'] === el);
                                    if (index !== -1) {
                                        rules[index] = {
                                            rule: el,
                                            count: rules[index].count + 1,
                                            files: [...rules[index].files, absolutePath],
                                        };
                                    }
                                });
                        }
                    });
            }
        });
    } catch (e) {}
};

const violation = dir => {
    getViolations(dir);
    const subDir = getDirectories(dir);
    subDir.forEach(folder => {
        if (!/node_modules/.test(folder)) {
            violation(folder);
        }
    });
};

const violations = violation(__dirname);

rules.sort((firstEl, secondEl) => {
    return secondEl.count - firstEl.count;
});

let JsonRules = {};

rules.forEach(rule => {
    if (!JsonRules[rule['rule']]) {
        JsonRules = { ...JsonRules, [rule['rule']]: rule };
    }
});

console.log(JsonRules);
