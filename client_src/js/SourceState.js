var SourceState = Backbone.Model.extend({
	defaults : {
		/** @type {string} A string identify the source text segment. Initialized once by PTM **/
		"segmentId" : null,
		
		/** @type {string[]} A list of strings representings tokens in the source text. Initialized once by PTM. **/
		"tokens" : [],
		
		/** @type {string|null} Index of the token under a mouse hover. **/
		"highlightTokenIndex" : null
	}
});
