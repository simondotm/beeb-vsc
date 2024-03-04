import Mocha from 'mocha'

const mocha = new Mocha({
  ui: 'tdd',
  color: true,
})
mocha.timeout(100000)

mocha.addFile('./out/server/test/tests.js')
mocha.run((failures: number) => {
  if (failures > 0) {
    new Error(`${failures} tests failed.`)
  } else {
    // resolve();
  }
})
