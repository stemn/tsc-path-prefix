export interface ITestInterface {
  name: string;
}

const test: ITestInterface = {
  name: 'test',
};

test.badProperty = 'error';
