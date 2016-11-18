var PARENT_DOMAIN = "qz.com";
var $interactive = $("#interactive-content");
var FM = null;

/**
 * Setup Frame Messenger and connect to parent.
 */
function setupFrameMessenger() {
	// Production: use frame messenging (will error if no parent frame)
	if (ENV == 'prod') {
		FM = frameMessager({
			allowFullWindow : false,
			parentDomain : PARENT_DOMAIN
		});

		FM.onMessage("app:activePost", resize);

		$("body").css("overflow", "hidden");
	// Test environment: no frame messenging
	} else {
		$("body").css("border", "#ff8080");
	}
}

/**
 * Compute the height of the interactive.
 */
function documentHeight () {
	var body = document.body;
	var html = document.documentElement;
	var height =	Math.max( body.scrollHeight, body.offsetHeight,
						 html.clientHeight, html.scrollHeight, html.offsetHeight );

	return height;
}

/**
 * Update parent height.
 */
function updateHeight (height) {
	if (!FM) {
		return;
	}

	height = height || documentHeight();

	FM.triggerMessage("QZParent", "child:updateHeight", {
		height : height
	});

	return;
}

/**
 * Resize the parent to match the new child height.
 */
function resize () {
	var height = $interactive.outerHeight(true);

	updateHeight(height);
}

/**
 * Scroll the parent window to a given location.
 *
 * Call like this:
 * fm.scrollToPosition($("#scrollToThisDiv").offset().top,500)
 *
 * Where 500 is the duration of the scroll animation
 */
function scrollToPosition (position,duration) {


	if (!FM) {
		$("html,body").animate({
			scrollTop: position
		}, duration);
	} else {
		FM.triggerMessage("QZParent", "child:scrollToPosition", {
			position : position,
			duration : 500
		});
	}
}

/**
 * Get a reference to the parent window.
 */
function getParentWindow () {
	return FM.triggerMessage("QZParent", "child:getWindow");
}

setupFrameMessenger();

module.exports = {
	resize: resize,
	scrollToPosition: scrollToPosition,
	getParentWindow: getParentWindow
};
