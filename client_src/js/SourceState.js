var SourceState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"highlightTokenIndex" : null,
		"tokens" : []
	}
});

SourceState.prototype.initialize = function( options ) {
	this.ptm = options.ptm;
};
