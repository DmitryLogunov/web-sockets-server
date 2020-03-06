import Ajv from 'ajv';
import fs from 'fs';
import yaml from 'js-yaml';
import { resolve } from 'path';

import { IConfig } from '@/src/types/interfaces';

const ajv = new Ajv({ schemaId: 'auto' });

/**
 * Initialize configuration
 * @param configFilename
 * @param configPath
 *
 * @returns { IConfig }
 */
export default (configFilename: string, configPath?: string): IConfig => {
  /* tslint:disable:no-console*/
  const configurationPath = process.env.CONFIGURATION_PATH || '';
  const pathToConfigfile = resolve(configPath || `${process.cwd()}${configurationPath}`) + `/${configFilename}`;

  if (!fs.existsSync(pathToConfigfile)) {
    console.error('Error: There is no Config file! The application can not be run so it will be terminated.');
    process.exit(1);
  }
  const configFile: string = fs.readFileSync(pathToConfigfile, 'utf8');
  const config: IConfig = yaml.safeLoad(configFile);

  if (!fs.existsSync(resolve(configPath || process.cwd()) + '/config.schema.json')) {
    console.warn(
      'There is no config schema file so config will not be validated. The config schema should be in the file config.schema.json (the folder is the same that config.yaml)'
    );
    return config;
  }

  const pathToSchema = resolve(configPath || process.cwd()) + '/config.schema.json';
  const validator = ajv.compile(require(pathToSchema));
  const valid = validator(config);
  if (!valid) {
    console.error(`Config is not valid! Error: ${JSON.stringify(validator.errors)}`);
    process.exit(1);
  }

  return config;
};
