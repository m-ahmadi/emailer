$(function () {
	a.checkSession();
	a.monthpicker.initialize();
	a.initializeMaterial();
	
	a.profile.makeAutocomplete('autocomplete_1');
	//a.autoc.defEvt();
	
	$('.fn-radio').on('click', a.userSelect.main);
	$('.fn-us-input').on('keyup', a.userSelect.unsetRecep);
	
	$('#fn-submit-first').on('click', a.buttons.first);
	$('#fn-submit-second').on('click', a.buttons.second);
	
	$('body').on('click', a.monthpicker.hide);
	$('#fn-mp-input').on('click', a.monthpicker.show);
	$('.fn-month').on('click', a.monthpicker.main)

	$('.fn-mp-next').on('click', a.monthpicker.next);
	$('.fn-mp-prev').on('click', a.monthpicker.prev);
	
});