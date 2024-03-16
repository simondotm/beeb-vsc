export type Environment = 'dev' | 'prod'

// injected by esbuild
declare global {
  const environment: Environment
}

/**
 * feature flags
 * prod = available in prod version
 * dev = available in dev version only
 * disabled = not available in any version
 * this allows us to commit WIP features to main branch without them being available in prod
 */
export type FeatureFlagsType = Record<string, Environment | 'disabled'>

export interface Config {
  featureFlags: FeatureFlagsType
}

const featureFlags = {
  emulator: 'dev',
} satisfies FeatureFlagsType

export const config: Config = {
  featureFlags,
}

export type FeatureFlags = keyof typeof featureFlags

export function isFeatureEnabled(flag: FeatureFlags): boolean {
  const flagConfig = config.featureFlags[flag]
  return (
    flagConfig !== 'disabled' &&
    (config.featureFlags[flag] === environment ||
      config.featureFlags[flag] === 'prod')
  )
}

export function isProd(): boolean {
  return environment === 'prod'
}

export function isDev(): boolean {
  return environment === 'dev'
}
