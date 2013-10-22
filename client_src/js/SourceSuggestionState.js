var SourceSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"tokenIndex" : null,
		"source" : "",
		"leftContext" : "",
		"targets" : [],
		"scores" : [],
		"xCoord" : 0,
		"yCoord" : 0,
		"hasFocus" : false
	}
});

SourceSuggestionState.prototype.initialize = function( options ) {
	this.view = new SourceSuggestionView({ "model" : this, "el" : options.el });
};
