Work in progress

The xsl file `rng-simplification-total.xsl` is automatically executed on the `TEILex0.rng.xml` file, using saxonHE.
This is triggered in two stages: `.vscode/settings.json` configures the VSCode plugin `Trigger task on save` to call the `xsl` task from `.vscode/tasks.json`. This task then uses the `XSLT/XPath for Visual Studio Code` plugin to run the xslt on the xml.

Additionally, we use the `xslt3` dependency (a compiler of xsl files to run in saxonjs, to my understanding) to also compile the xslt to a `.sef` which can be executed by `saxonjs` in the browser. Because native browser xslt support is very meagre and extremely slow.

