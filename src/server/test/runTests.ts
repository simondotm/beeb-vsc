import * as Mocha from 'mocha';

const mocha = new Mocha({
    ui: 'tdd',
    color: true
});
mocha.timeout(100000);

mocha.addFile('./server/out/test/tests.js');
mocha.run(failures => {
    if (failures > 0) {
        new Error(`${failures} tests failed.`);
    } else {
        // resolve();
    }
});

