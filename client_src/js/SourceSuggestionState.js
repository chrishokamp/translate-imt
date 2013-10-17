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
