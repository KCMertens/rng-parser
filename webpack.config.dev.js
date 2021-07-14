const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
	entry: './src/index.ts',
	// {
	// 	interface: './src/interface/index.ts',
	// 	parser: './src/parser/index.ts'
	// },
	module: {
		rules: [{
			test: /\.css$/,
			use: ['vue-style-loader', 'css-loader'],
		}, {
			test: /\.scss$/,
			use: ['vue-style-loader', 'css-loader', 'sass-loader']
		}, {
			test: /\.vue$/i,
			use: 'vue-loader',
		}, {
			test: /\.tsx?$/,
			exclude: /node_modules/,
			loader: 'ts-loader',
			options: {
				appendTsSuffixTo: [/\.vue$/i],
			}
		}, {
			test: /\.xsl|\.xml$/i,
			use: 'raw-loader'
		}],
	},
	output: {
		filename: 'bundle.js',
		// filename: '[name].js',
		// Path on disk for output file
		path: path.resolve(__dirname, 'dist'),
		// Path in webpack-dev-server for compiled files (has priority over disk files in case both exist)
		publicPath: '/dist/',
	},
	resolve: {
		extensions: ['.js', '.ts'], // enable autocompleting .ts and .js extensions when using import '...'
		alias: {
			// Enable importing source files by their absolute path by prefixing with "@/"
			// Note: this also requires typescript to be able to find the imports (though it doesn't use them other than for type checking), see tsconfig.json
			"@": path.join(__dirname, "src"),
		}
	},
	plugins: [
		new VueLoaderPlugin(),
	],
	devtool: "eval-source-map",
};