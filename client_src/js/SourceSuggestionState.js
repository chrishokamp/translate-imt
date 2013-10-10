var SourceSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"tokenIndex" : null,
		"source" : "",
		"targets" : [],
		"xCoord" : 0,
		"yCoord" : 0
	}
});
