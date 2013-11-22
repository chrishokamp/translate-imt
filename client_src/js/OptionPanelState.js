var OptionPanelState = Backbone.Model.extend({
	defaults : {
		"enableHover" : true,
		"enableSuggestions" : true,
		"enableMT" : true
	}
});

OptionPanelState.prototype.initialize = function() {
	this.view = new OptionPanelView({ model : this });
};
