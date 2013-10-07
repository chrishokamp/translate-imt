var SourceState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,            // A string identifying the source text segment. Constant.
		"tokens" : [],                 // A list of strings, representing tokens in the source text. Constant.
		"highlightTokenIndex" : null   // Integer or null, pointing to any highlighted token.
	}
});

SourceState.prototype.initialize = function( options ) {
	this.ptm = options.ptm;
};
