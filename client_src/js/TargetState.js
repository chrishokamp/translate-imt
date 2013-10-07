var TargetState = Backbone.Model.extend({
	defaults : {
		"userText" : "",
		"prefix" : null,
		"translations" : [],
		"caretIndex" : 0,
		"hasFocus" : false,
		
		"tokens" : [],
		"isExpired" : false,
		"isLoading" : false
	}
});

TargetState.prototype.initialize = function( options ) {
	this.ptm = options.ptm;
	this.on( "change reset", this.update );
};

TargetState.prototype.update = function() {
	
};
