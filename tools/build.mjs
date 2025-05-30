/* global process */
import { rollup } from 'rollup';
import jsonPlugin from '@rollup/plugin-json';
import { babel } from '@rollup/plugin-babel';
import { lively } from 'lively.freezer/src/plugins/rollup';
import resolver from 'lively.freezer/src/resolvers/node.cjs';
import PresetEnv from '@babel/preset-env';

const verbose = process.argv[2] === '--verbose';
const minify = process.env.MINIFY;
try {
const build = await rollup({
  input: './index.js',
  shimMissingExports: true,  
  plugins: [
    lively({
      autoRun: {
        title: 'gpacix--lively-one',
      },
      minify,
      verbose,
      asBrowserModule: true,
      excludedModules: [
	    'lively.collab',
        'mocha-es6','mocha', // references old lgtg that breaks the build
        'rollup', // has a dist file that cant be parsed by rollup
        // other stuff that is only needed by rollup
        '@babel/preset-env',
        '@babel/plugin-syntax-import-meta',
        '@rollup/plugin-json', 
        '@rollup/plugin-commonjs',
        'rollup-plugin-polyfill-node',
        'babel-plugin-transform-es2015-modules-systemjs'
      ],
      resolver
    }),
    jsonPlugin({ exclude: [/https\:\/\/jspm.dev\/.*\.json/, /esm\:\/\/cache\/.*\.json/]}),
    babel({
     babelHelpers: 'bundled', 
     presets: [PresetEnv]
    })
   ]
});

await build.write({
  format: 'system',
  dir: 'build'
});

} catch (err) {
  console.log(err);
  process.exit(1);
}
