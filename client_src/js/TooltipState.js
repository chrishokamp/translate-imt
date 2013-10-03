var TooltipState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"tokenIndex" : null,
		"source" : "",
		"targets" : [],
		"xCoord" : 0,
		"yCoord" : 0
	}
});

TooltipState.prototype.initialize = function( options ) {
	this.ptm = options.ptm;
};
