1. [x] simplify rng document
2. [x] parse rng document into intermediate format (analogous to the xmlStructure object produced by the dtd parser)
3. [x] convert intermediate format into xema format, as that seems to be what drives the entire application
4. [x] store xema and see if it works in the current implementation
5. [ ] augment the xema, docspec, xematron and editor to add additional required features such as separate element names.
  - [x] add ability to separate element name from definition name and add reverse lookup during document parse
  - [ ] preserve warnings present in the rng schema
  - [ ] improve choices in the rng schema, preserve groups under choices?
  - [ ] parse regex patterns for validation
    - [ ] actually validate using the regex patterns