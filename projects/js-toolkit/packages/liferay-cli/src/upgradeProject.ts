/**
 * SPDX-FileCopyrightText: © 2020 Liferay, Inc. <https://liferay.com>
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

/* eslint-disable @liferay/no-dynamic-require */
/* eslint-disable @typescript-eslint/no-var-requires */

import {
	FilePath,
	TRANSFORM_OPERATIONS,
	format,
	transformJsonFile,
	transformTextFile,
} from '@liferay/js-toolkit-core';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import prompt from './util/prompt';

const {
	LiferayJson: {setLiferayJsonDeployPath},
	PkgJson: {addDependencies, deleteDependencies, deleteScripts, setScripts},
	Text: {appendLines, removeLines},
} = TRANSFORM_OPERATIONS;
const {fail, info, print, success, text, title, warn} = format;

export default async function upgradeProject(): Promise<void> {
	/* eslint-disable-next-line @typescript-eslint/no-var-requires */
	const {version} = require('../package.json');

	print('', title`|👋 |Welcome to Liferay Project Upgrader v${version}`, '');

	if (!fs.existsSync('package.json')) {
		print(
			fail`
File package.json not found: {please run this command in a project's directory}
`
		);
		process.exit(1);
	}

	print(text`|⚙ |Analyzing project...`);

	const pkgJson = require(path.resolve('package.json'));
	pkgJson.devDependencies = pkgJson.devDependencies || {};
	pkgJson.scripts = pkgJson.scripts || {};

	print(info`Project name: {${pkgJson.name}}`);

	print(
		info`Development dependencies:\n${Object.entries(
			pkgJson.devDependencies
		)
			.map(([name, version]) => `   · {${name}}: ${version}`)
			.join('\n')}`
	);

	print(
		info`Scripts:\n${Object.entries(pkgJson.scripts)
			.map(([name, command]) => `   · {${name}}: ${command}`)
			.join('\n')}`
	);

	print(
		text`

Now the upgrade process will offer you to make some changes to your project.

Before proceeding, we will show you the list of changes to be done and ask for
confirmation.

We recommend you to do a backup or commit your current project's state to your
version control system so that, if anything goes wrong, you may rollback the
upgrade.

Also, take into account that the upgrade process does its best effort, but you
may need to take some extra steps to finish the upgrade, depending on how much
you tweaked your project after it was generated by Liferay JavaScript Toolkit's
Yeoman generator.

Let's see the list of changes:

 · Convert {.npmbuildrc} to {.liferay.json}
 · Move everything under {assets} to {src} folder
 · Remove old Liferay JavaScript Toolkit dependencies from {package.json}
 · Add {@liferay/portal-agnostic} dependency to {package.json}
 · Tweak {build} script in {package.json}
 · Tweak {deploy} script in {package.json}
 · Add {clean} script to {package.json}
 · Remove {copy-assets} script from {package.json}
 · Remove {start} script from {package.json}
 · Remove {translate} script from {package.json}
 · Remove redundant configuration from {.npmbundlerrc}
`,
		warn`
Note that, as a result of the last two modifications, you will lose support for
{npm run translate} and {npm run start}. If you are not using these scripts you
don't need to worry about it, but if you really need them in your upgraded
projects, please contact us by filing an issue in the following URL, saying that
you are upgrading a project and you need them:

    https://github.com/liferay/liferay-frontend-projects/issues/new

Thanks a lot for your cooperation!
`
	);

	const answer = await prompt(false, {}, [
		{
			default: false,
			message: 'Do you wish to proceed with the upgrade?',
			name: 'confirm',
			type: 'confirm',
		},
	]);

	if (!answer['confirm']) {
		print('', fail`Upgrade has been cancelled!`, '');
		process.exit(1);
	}

	print('');

	await convertNpmbuildrcToLiferayJson();
	await moveAssetsToSrc();
	await migratePackageJson();
	await migrateNpmbundlerrc();

	print(
		'',
		text`
The project has been upgraded to {@liferay/cli} platform. Please make sure
nothing was broken by comparing your backup or previous version control system
copy to the modified project.
	`,
		warn`
Remember that the support for {npm run start} and {npm run translate} has been
dropped. If you were not using these scripts you don't need to worry about it,
but if you really need them, please undo the upgrade and contact us by filing an
issue in the following URL, saying that you are upgrading a project and you need
them:

    https://github.com/liferay/liferay-frontend-projects/issues/new
`,
		title`Enjoy your upgraded project!| 🎉|
`
	);
}

async function convertNpmbuildrcToLiferayJson(): Promise<void> {
	const npmbuildrc = safeReadJson('.npmbuildrc');

	const liferayJsonFile = ensureFile('.liferay.json', '{}');

	await transformJsonFile(
		liferayJsonFile,
		liferayJsonFile,
		setLiferayJsonDeployPath(npmbuildrc['liferayDir'])
	);

	const gitignoreFile = ensureFile('.gitignore');

	await transformTextFile(
		gitignoreFile,
		gitignoreFile,
		appendLines('/.liferay.json'),
		removeLines((line) => line.trim() === '/.npmbuildrc')
	);

	const npmignoreFile = ensureFile('.npmignore');

	await transformTextFile(
		npmignoreFile,
		npmignoreFile,
		appendLines('.liferay.json'),
		removeLines((line) => line.trim() === '.npmbuildrc')
	);

	fs.unlinkSync('.npmbuildrc');

	print(success`Converted {.npmbuildrc} to {.liferay.json}`);
}

async function migrateNpmbundlerrc(): Promise<void> {
	const npmbundlerrc = safeReadJson('.npmbundlerrc');

	const createJar = npmbundlerrc['create-jar'];

	if (createJar) {
		if (createJar['output-dir'] === 'dist') {
			delete createJar['output-dir'];
		}

		const features = createJar['features'];

		if (features) {
			const pkgJson = require(path.resolve('package.json'));

			if (features['js-extender'] === true) {
				delete features['js-extender'];
			}

			if (
				features['web-context'] ===
				`/${pkgJson.name}-${pkgJson.version}`
			) {
				delete features['web-context'];
			}

			if (features['localization'] === 'features/localization/Language') {
				delete features['localization'];
			}

			if (features['configuration'] === 'features/configuration.json') {
				delete features['configuration'];
			}

			if (!Object.keys(features).length) {
				delete createJar['features'];
			}
		}

		if (!Object.keys(createJar).length) {
			delete npmbundlerrc['create-jar'];
		}
	}

	if (Object.keys(npmbundlerrc).length) {
		fs.writeFileSync(
			'.npmbundlerrc',
			JSON.stringify(npmbundlerrc, null, 2)
		);
	}
	else {
		fs.unlinkSync('.npmbundlerrc');
	}

	print(success`Removed redundant configuration from {.npmbundlerrc}`);
}

async function migratePackageJson(): Promise<void> {
	const pkgJsonFile = new FilePath('package.json');

	await transformJsonFile(
		pkgJsonFile,
		pkgJsonFile,
		deleteDependencies(
			'liferay-npm-bundler',
			'liferay-npm-build-support',
			'copy-webpack-plugin',
			'webpack',
			'webpack-cli',
			'webpack-dev-server',
			'@babel/cli',
			'@babel/core',
			'@babel/preset-env'
		)
	);

	print(
		success`Removed old Liferay JavaScript Toolkit dependencies from {package.json}`
	);

	await transformJsonFile(
		pkgJsonFile,
		pkgJsonFile,
		addDependencies({
			'@liferay/portal-agnostic': '*',
		})
	);

	print(
		success`Added {@liferay/portal-agnostic} dependency to {package.json}`
	);

	await transformJsonFile(
		pkgJsonFile,
		pkgJsonFile,
		setScripts({
			build: 'liferay build',
			clean: 'liferay clean',
			deploy: 'liferay deploy',
		}),
		deleteScripts('copy-assets', 'start', 'translate')
	);

	print(
		success`Tweaked {build} script in {package.json}`,
		success`Tweaked {deploy} script in {package.json}`,
		success`Added {clean} script to {package.json}`,
		success`Removed {copy-assets} script from {package.json}`,
		success`Removed {start} script from {package.json}`,
		success`Removed {translate} script from {package.json}`
	);
}

async function moveAssetsToSrc(): Promise<void> {
	if (!fs.existsSync('assets')) {
		print(info`Skipping move everything under {assets} to {src} folder`);

		return;
	}

	visitFiles('assets', (dirPath, fileName) => {
		const filePath = path.join(dirPath, fileName);

		if (fileName === '.placeholder') {
			return;
		}

		const relFilePath = path.relative('assets', filePath);
		const assetsRelFilePath = path.join('assets', relFilePath);

		let srcRelFilePath = path.join('src', relFilePath);

		srcRelFilePath = srcRelFilePath.replace(/.css$/i, '.scss');

		fs.mkdirSync(path.dirname(srcRelFilePath), {recursive: true});

		fs.writeFileSync(srcRelFilePath, fs.readFileSync(assetsRelFilePath));

		fs.unlinkSync(assetsRelFilePath);
	});

	await fsPromises.rmdir('assets', {recursive: true});

	print(success`Moved everything under {assets} to {src} folder`);
}

function ensureFile(posixFilePath: string, initialContent = ''): FilePath {
	if (!fs.existsSync(posixFilePath)) {
		fs.writeFileSync(posixFilePath, initialContent);
	}

	return new FilePath(posixFilePath, {posix: true});
}

function safeReadJson(posixFilePath: string): object {
	try {
		return JSON.parse(
			fs.readFileSync(
				new FilePath(posixFilePath, {posix: true}).toString(),
				'utf8'
			)
		);
	}
	catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}

	return {};
}

function visitFiles(
	dirPath: string,
	callback: {(dirPath: string, fileName: string): void}
): void {
	fs.readdirSync(dirPath, {withFileTypes: true}).forEach((dirent) => {
		if (dirent.isDirectory()) {
			visitFiles(path.join(dirPath, dirent.name), callback);
		}
		else {
			callback(dirPath, dirent.name);
		}
	});
}