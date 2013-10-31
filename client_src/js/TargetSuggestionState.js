var TargetSuggestionState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"candidates" : [],
		"xCoord" : 0,
		"yCoord" : 0,
		"optionIndex" : null,
		"hasFocus" : false
	}
});

TargetSuggestionState.prototype.initialize = function( options ) {
	this.view = new TargetSuggestionView({ "model" : this, "el" : options.el });
};

TargetSuggestionState.prototype.nextOption = function() {
	var candidates = this.get( "candidates" );
	var optionIndex = this.get( "optionIndex" );
	if ( optionIndex === null )
		optionIndex = 0;
	else
		optionIndex ++;
	optionIndex = Math.min( optionIndex, candidates.length -1 );
	this.set( "optionIndex", optionIndex );
};

TargetSuggestionState.prototype.previousOption = function() {
	var optionIndex = this.get( "optionIndex" );
	if ( optionIndex === 0 )
		optionIndex = null;
	else
		optionIndex --;
	this.set( "optionIndex", optionIndex );
};

TargetSuggestionState.prototype.noOption = function() {
	this.set( "optionIndex", null );
};
