This library is a work in progress. 
It transforms a Relax-NG validation file into a ruleset for the [Lexonomy xml editor](https://github.com/elexis-eu/Lexonomy). 

For now, the conversion only accepts Relax-NG files in XML format (see [here](https://relaxng.org/tutorial-20011203.html) for a few examples). The [compact syntax](https://www.oasis-open.org/committees/relax-ng/compact-20021121.html) is not supported at this time.


The conversion has several steps: 
1. The schema is parsed as XML file, we use basic browser support to do this. Meaning it will not run under Node for now.
2. It's simplified according to the rules in the Relax-NG spec [outlined here](https://www.oasis-open.org/committees/relax-ng/spec-20011203.html#simplification) by applying the xslt file [rng-simplification.xsl](data/rng-simplification.xsl) 
  Note that at the end of the simplification a few additional rules have been added to make parsing a litte simpler. As our goal here is not to merely validate an xml file, but to set-up a set of constraints. It's the difference between asking "can child Y exist beneath X" versus "what is the list of children X can contain".
3. The (simplified) document is then parsed into a javascript object outlining some rules regarding allowed attributes/children on elements. 
4. That object is then converted into a Lexonomy "`Xema`". Essentially a config that Lexonomy uses to generate a `DocSpec`, which is yet another object that contains the rules by which it constrains the XML editor.

-----------

## Building

**1. Install dependencies**
Install a recent-ish version of NodeJS. Then run `npm install` in the project's root.

**2. Prepare the xslt for running in the browser**
If you've changed the simplify xslt file: 
Run `npm run sef` and a `.sef.json` file will be generated in the data/ directory. `saxon-js` needs this to run the xslt in the browser (we don't use native browser xslt functions because some newer features we need are not supported).  
   If you use [visual studio code](https://code.visualstudio.com/download) and install the recommended extensions, this will happen automatically on save.

**3. Build it**
`npm run build` will create an `rngparser.js` file for use in a webpage.

## Usage

When using this as npm dependency: should just work by using `import ... from 'rng-parser'`. 
When using on a webpage: there will be a global `RngParser` object that contains exported functions. See the `rng-parser.d.ts` file (created on build) for available functions. 
