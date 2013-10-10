var SourceState = Backbone.Model.extend({
	defaults : {
		/** @type {string} A string identify the source text segment. Initialized once by PTM **/
		"segmentId" : null,
		
		/** @type {string[]} A list of strings representings tokens in the source text. Initialized once by PTM. **/
		"tokens" : [],
		
		/** @type {integer|null} Index of the token under mouse hover. **/
		"hoverTokenIndex" : null,
		
		/** @type {{integer:true}} Indexes of tokens that have a corresponding term in the typing UI. **/
		"matchedTokenIndexes" : {}
	}
});
