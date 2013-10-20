var SourceSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"tokenIndex" : null,
		"source" : "",
		"targets" : [],
		"scores" : [],
		"xCoord" : 0,
		"yCoord" : 0
	}
});

SourceSuggestionState.prototype.initialize = function( options ) {
	this.view = new SourceSuggestionView({ "model" : this });
};
