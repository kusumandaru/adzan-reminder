import * as vs from 'vscode';

export interface AdzanConfig {
  city: string;
  country: string;
  showPraytime: boolean;
}

/**
 * Read the workspace configuration for 'adzan-reminder' and return a AdzanConfig.
 * @return {AdzanConfig} config object
 */
export const getConfig: () => AdzanConfig = () => {
  const conf = vs.workspace.getConfiguration('adzan-reminder');

  return {
    city: conf.get('city', 'Jakarta'),
    country: conf.get('country', 'Indonesia'),
    showPraytime: conf.get('showPraytime', true)
  };
};