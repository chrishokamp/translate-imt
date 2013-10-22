var TargetSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"candidates" : [],
		"xCoord" : 0,
		"yCoord" : 0,
		"hasFocus" : true
	}
});

TargetSuggestionState.prototype.initialize = function( options ) {
	this.view = new TargetSuggestionView({ "model" : this, "el" : options.el });
};
