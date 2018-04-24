import jsonProvider from './jsonProvider';
import mysqlProvider from './mysqlProvider';

import config from '../../config.json';

const provider = (config.useJson === true) ? jsonProvider : mysqlProvider;
export default provider;