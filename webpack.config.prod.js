const path = require('path');

module.exports = {
	entry: {
		'rngparser': './src/rng-parser.ts',
		// interface: './src/interface/index.ts',
		// parser: './src/parser/index.ts'
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			exclude: /node_modules/,
			loader: 'ts-loader',
		}, {
			test: /\.xsl$/i,
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
		library: ['RngParser'] // add all exports to the global RngParser object
	},
	resolve: {
		extensions: ['.js', '.ts'], // enable autocompleting .ts and .js extensions when using import '...'
		alias: {
			// Enable importing source files by their absolute path by prefixing with "@/"
			// Note: this also requires typescript to be able to find the imports (though it doesn't use them other than for type checking), see tsconfig.json
			"@": path.join(__dirname, "src"),
		}
	},
	// devtool: "eval-source-map",
};