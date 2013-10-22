var TargetSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"candidates" : [],
		"xCoord" : null,
		"yCoord" : null,
		"isVisible" : false
	}
});

TargetSuggestionState.prototype.initialize = function( options ) {
	this.view = new TargetSuggestionView({ "model" : this, "el" : options.el });
};
