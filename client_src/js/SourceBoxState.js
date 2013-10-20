var SourceBoxState = Backbone.Model.extend({
	defaults : {
		/** @type {string} A string identify the source text segment. Value is set by PTM on initialization. */
		"segmentId" : null,
		
		/** @type {string[]} A list of strings representings tokens in the source text. Value is set by PTM on initialization. */
		"tokens" : [],
		
		/** @type {integer|null} Index of the token currently under mouse hover in the source box. **/
		"hoverTokenIndex" : null,
		
		/** @type {{integer:true}} Indexes of the tokens that correspond to the caret position in the typing UI. **/
		"caretTokenIndexes" : {},
		
		/** @type {{integer:true}} Indexes of tokens that correspond to the chunk being edited in the typing UI. **/
		"chunkTokenIndexes" : {},

		/** @type {{integer:true}} Indexes of tokens that have a corresponding term in the typing UI. **/
		"matchedTokenIndexes" : {},

		/** @type {boolean} **/
		"hasFocus" : false,
		
	}
});

SourceBoxState.prototype.initialize = function( options ) {
	this.view = new SourceBoxView({ "model" : this, "el" : options.el });
};
