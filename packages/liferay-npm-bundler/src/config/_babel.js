import {configRequire, getPackageConfig} from './_util';

let config;

/**
 * Initialize submodule
 * @param {object} state
 * @return {void}
 */
export function init(state) {
	config = state.config;
}

/**
 * Get Babel config for a given package
 * @param {PkgDesc} pkg the package descriptor
 * @return {Object} a Babel configuration object as defined by its API
 */
export function getConfig(pkg) {
	return getPackageConfig(pkg, '.babelrc', {});
}

/**
 * Get paths of files to be left untouched by babel
 * @return {Array} array of output-relative file paths to avoid when processing with Babel
 */
export function getIgnore() {
	return config['ignore'];
}

/**
 * Load Babel plugins from a given array of presets and plugins.
 * @param {Array} presets an array of Babel preset names as defined by .babelrc
 * @param {Array} plugins an array of Babel plugins names as defined by .babelrc
 * @return {Array} the instantiated Babel plugins
 */
export function loadBabelPlugins(presets, plugins) {
	return []
		.concat(
			...presets.map(preset => {
				let presetModule;

				try {
					presetModule = configRequire(preset);
				} catch (err) {
					presetModule = configRequire(`babel-preset-${preset}`);
				}

				return presetModule.plugins || presetModule.default().plugins;
			})
		)
		.concat(plugins);
}
