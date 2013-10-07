var TooltipState = Backbone.Model.extend({
	defaults : {
		"source" : "",     // Source text that triggered the tooltip, needed to verify synchronization.
		"targets" : [],    // List of terms to display in the tooltip
		"xCoord" : 0,
		"yCoord" : 0
	}
});
