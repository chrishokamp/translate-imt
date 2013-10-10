var TargetSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"chunkIndex" : null,
		"candidates" : [],
		"xCoord" : 0,
		"yCoord" : 0
	}
});
