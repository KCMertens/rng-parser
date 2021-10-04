const path = require('path');
module.exports = {
	entry: {
		'rngparser': './src/rng-parser.ts',
		'docspec': './src/docspec.ts',
	},
	module: {
		rules: [{
			test: /\.css$/,
			use: ['style-loader', 'css-loader']
		}, {
			test: /\.scss$/,
			use: ['style-loader', 'css-loader', 'sass-loader']
		}, {
			test: /\.tsx?$/,
			exclude: /node_modules/,
			loader: 'ts-loader',
		}, {
			test: /\.xsl|\.xml$/i,
			use: 'raw-loader'
		}],
	},
	output: {
		filename: '[name].js',
		// Path on disk for output file
		path: path.resolve(__dirname, 'dist'),
		// Path in webpack-dev-server for compiled files (has priority over disk files in case both exist)
		publicPath: '/dist/',
		clean: true, // clean previous outputs prior to compiling
		library: '[name]lib',
	},
	resolve: {
		extensions: ['.js', '.ts'], // enable autocompleting .ts and .js extensions when using import '...'
		alias: {
			// Enable importing source files by their absolute path by prefixing with "@/"
			// Note: this also requires typescript to be able to find the imports (though it doesn't use them other than for type checking), see tsconfig.json
			"@": path.join(__dirname, "src"),
		}
	},
	externals: {
		"@kcmertens/xonomy": "Xonomy"
	},
	devtool: "eval-source-map",

	// enabling this breaks exporting to window through the library option above.
	// See https://github.com/webpack/webpack/issues/11887
	devServer:{injectClient: false},
};