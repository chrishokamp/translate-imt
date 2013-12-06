var TargetSuggestionState = Backbone.Model.extend();

TargetSuggestionState.prototype.reset = function() {
	this.set({
		"segmentId" : null,
		"overlayEditing" : "",
		"candidates" : [],
		"xCoord" : 0,
		"yCoord" : 0,
		"optionIndex" : 0,
		"hasFocus" : false
	}, { silent : true } );
};

TargetSuggestionState.prototype.initialize = function( options ) {
	this.reset();
	this.view = new TargetSuggestionView({ "model" : this, "el" : options.el });
};

TargetSuggestionState.prototype.nextOption = function() {
	var candidates = this.get( "candidates" );
	var optionIndex = this.get( "optionIndex" );
	optionIndex ++;
	optionIndex = Math.min( optionIndex, candidates.length -1 );
	this.set( "optionIndex", optionIndex );
};

TargetSuggestionState.prototype.previousOption = function() {
	var optionIndex = this.get( "optionIndex" );
	optionIndex --;
	optionIndex = Math.max( optionIndex, 0 );
	this.set( "optionIndex", optionIndex );
};

TargetSuggestionState.prototype.noOption = function() {
	this.set( "optionIndex", null );
};
