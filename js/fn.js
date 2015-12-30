sessionStorage.session = 'xyz';
sessionStorage.username = 'ershadi-mo';

var a = (function () {
'use strict';
var urls = {
	SERVER_1: 'http://100.80.0.175',
	SERVER_2: 'http://10.255.135.92',
	CPNI: '/cgi-bin/cpni',
	FCPNI: '/fcpni',
	actions: {
		GET_AUTH_URL: 'GetAuthURL',
		GET_DATE: 'GetDate',
		GET_USER_INFO: 'GetUserInfo',
		GET_GROUPS: 'Getgroups',
		SEND_MAIL_BILL: 'SendMailBill',
		GET_JOB_STATUS: 'GetJobStatus',
		AC_USERNAME: 'AcUsername'
	},
	get returnUrl() {
		return this.mainServer + '/emailer';
	},
	get mainServer() {
		return this.SERVER_1;
	},
	get mainScript() {
		return this.FCPNI;
	},
	get mainUrl() {
		return this.mainServer + this.mainScript;
	}
},
general = {
	currentSession: sessionStorage.session,
	currentUser: {
		username: '',
		email: ''
	},
	treeStructure: [],
	allNodes: [],
	jobId: 0,
	selectedNodes: {
		groups:[],
		users: [],
		groupsAndUsers: [],
		groupNames: [],
		userCount: 0
	},
	selectedDate: '',
	currentYear: 0,
	recipient: '',
	autocompleteObjArr: [],
	specificSend: false,
	formatUserInfo: function (user) {
		//console.log( atob( user.ldap_dn.slice(0, -3) ) );
		//console.log(user.ldap_sn);
		var nameRow = '',
			fullnameArr = [],
			fullnameFa = '',
			fullnameEn = '',
			firstname = '',
			lastname = '',
			result;
		if (typeof user.ldap_cn !== 'undefined') {
			nameRow = Base64.decode( user.ldap_cn );
		} else if (typeof user.ldap_dn !== 'undefined') {
			Base64.decode( user.ldap_dn ).split(',').forEach(function (i) {
				if ( i.slice(0, 3) === 'CN=' ) {
					nameRow = i.slice(3);
					return;
				}
			});
		}
		fullnameArr = nameRow.split(' - '),  // 
		fullnameFa = fullnameArr[1] +' '+ fullnameArr[0],
		fullnameEn = Base64.decode( user.ldap_givenname ) +' '+ Base64.decode( user.ldap_sn.slice(0, -1) ),	// atob( user.ldap_givenname ) +' '+ atob( user.ldap_sn.slice(0, -1) );
		firstname = fullnameArr[1], // Base64.decode( user.ldap_givenname )
		lastname = fullnameArr[0];  // Base64.decode( user.ldap_sn.slice(0, -1) )
		// atob		->		Base64.decode
		result = {
			username: user.username,
			fullnameFa: fullnameFa,
			fullnameEn: fullnameEn,
			firstname: firstname,
			lastname: lastname,
			email: user.email,
			title: Base64.decode( user.ldap_title ),
			number: user.number
		};
		if ( typeof user.photo === 'string' && !util.isEmptyString(user.photo) ) {
			result.photo = urls.mainServer + user.photo;
		}
		return result;
	}
},
util = {
	isObject: function (v) {
		return Object.prototype.toString.call(v) === "[object Object]";
	},
	isArray: function (v){
		if ( typeof Array.isArray === 'function' ) {
			return Array.isArray(v);
		} else {
			return Object.prototype.toString.call(v) === "[object Array]";
		}
	},
	isEmptyString: function (v) {
		return ( typeof v === 'string'  &&  v.length === 0 ) ? true : false;
	},
	getCommentsInside: function (selector) {
		return $(selector).contents().filter( function () { return this.nodeType == 8; } );
	}
},
checkSession = (function () {
	var sessionExist = function () {
		return (typeof general.currentSession === 'undefined' ) ? false : true;
	},
	redirect = function () {
		
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: {
				action: urls.actions.GET_AUTH_URL,
				return_url: urls.returnUrl
			}
		})
		.done(function (data) {
			window.location.replace(data[0].auth_url); // '&state=http://10.255.135.92/emailer'
		})
		.fail(function () {
			setTimeout(function () {
				redirect();
			}, 2000);
		});
	},
	isSessionValid = function (session, valid, invalid) {
		var user;
		
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: {
				action: urls.actions.GET_USER_INFO,
				session: general.currentSession
			}		
		})
		.done(function (data) {
			//console.log(typeof data[0][sessionStorage.username]);
			user = data[0][sessionStorage.username];
			if ( typeof data[0][sessionStorage.username] !== 'undefined' ) {
				valid(user);
			} else if ( typeof data[0].error_msg === 'string' ) {
				
				invalid();
			}
		})
		.fail(function () {
			setTimeout(function () {
				isSessionValid(session, valid, invalid);
			}, 2000);
		});
	},
	main = function (user) {
		$('body').removeClass('preloading');
		$('.header').removeClass('no-display');
		$('.content').removeClass('no-display');
		$('.footer').removeClass('no-display');
		
		$('.my-preloader').remove();
		
		profile.updateProfile(user);
		currentUser.updateProfile( general.formatUserInfo(user) );
		
		general.currentUser.username = user.username;
		general.currentUser.email = user.email;
		general.recipient = general.currentUser.username;
		$('.fn-us-input').val(general.currentUser.username);
		
		misc.time();
		tree.loadTree();
	};
	
	return function () {
		if (!sessionExist) {
			redirect();
		} else if (sessionExist) {
			isSessionValid(general.currentSession, main, redirect);	// main if valid, redirect if not valid
		}
	};
}()),
profile = (function () {
	var updateProfile = function (user) {
		if (typeof user === 'undefined') { throw new Error('profile.updateProfile:  user is undefined.'); }
		var tmp = atob( user.ldap_dn.slice(0, -3) ),
			nameRow,
			fullname,
			firstname,
			lastname;
		
		Base64.decode( user.ldap_dn ).split(',').forEach(function (i) {
			if ( i.slice(0, 3) === 'CN=' ) {
				nameRow = i.slice(3);
				return;
			}
		});
		fullname = nameRow.split(' - ');
		firstname = fullname[1];
		lastname = fullname[0];
		// atob		->		Base64.decode
		
		if (user.photo) {
			$('#fn-profile-img').attr({ src: urls.mainServer + user.photo });
		}
		$('#fn-profile-firstname').html( firstname ); // Base64.decode( user.ldap_givenname )
		$('#fn-profile-lastname').html( lastname ); // Base64.decode( user.ldap_sn.slice(0, -1) )
		$('#fn-profile-email').html(  user.email );
		$('#fn-profile-title').html( Base64.decode( user.ldap_title ) );
		$('#fn-profile-phone').html(  user.number );
	},
	makeAutocomplete = function (divId) {
		$('#'+divId).autocomplete({
			source: function ( request, response ) {
				$.ajax({
					url: urls.mainUrl,
					type: 'GET',
					dataType: "json",
					data : {
						action: urls.actions.AC_USERNAME,
						session: general.currentSession,
						str: request.term
					}
				}).done(function ( data ) {
					var arrList = [],
						key = '',
						res = data[0];
					for ( key in res ) {
						if ( res.hasOwnProperty(key) ) {
							arrList.push(key);
						}
					}
					response( arrList ); // response( data[0] ); 
				}).fail(function (data, errorTitle, errorDetail) {
					alertify.error('AcUsername failed<br />'+errorTitle+'<br />'+errorDetail);
				});
			},
			select: function ( event, ui ) {
				general.recipient = ui.item.value;
				$('.fn-us-input').val(ui.item.value);
			}
		});
	};
	
	return {
		updateProfile: updateProfile,
		makeAutocomplete: makeAutocomplete
	};
}()),
tree = (function () {
	var useJstree = function (divId, treeStructure) {
		$.jstree.defaults.plugins = [
			//"grid"
			"checkbox"
			// "contextmenu", 
			// "dnd", 
			// "massload", 
			// "search", 
			// "sort", 
			// "state", 
			// "types", 
			// "unique", 
			// "wholerow", 
			// "changed", 
			// "conditionalselect"
		];
		
		$('#'+divId).jstree({
			core : {
				//animation : 0,
				data : treeStructure
			},
			types : {
				"default" : {
					//"icon" : "jstree-icon jstree-file"
					"disabled" : { 
						"check_node" : false, 
						"uncheck_node" : false 
					}
				},
				"demo" : {
				}
			}
		});
		$('.fn-treetoolbar').removeClass('disabled');
	},
	getSelection = function (selected, treeId) {
		if ( !util.isArray(selected) ) { throw new Error('getSelection:  Argument is not an array.'); }
		var childless = [],
			withChild = [];
			
		general.selectedNodes.groups = [];
		general.selectedNodes.users = [];
		general.selectedNodes.groupsAndUsers = [];
		general.selectedNodes.groupNames = [];
		general.selectedNodes.userCount = 0;
		
		selected.forEach(function (item) {
			if (item.children.length === 0) {
				if (  $.inArray( item.text, childless ) === -1  ) {
					childless.push(item);
					general.selectedNodes.userCount += 1;
				}
			} else if (item.children.length !== 0) {
				withChild.push(item);
			}
		});
		childless.forEach(function (item) {
			var parent = $('#'+treeId).jstree(true).get_node(item.parent);
			if ( parent.state.selected === false || item.parent === '#' ) {
				general.selectedNodes.users.push(item.text);
				general.selectedNodes.groupsAndUsers.push(item.text);
			}
		});
		withChild.forEach(function (item) {
			if ( item.children.length !== 0 && item.state.selected === true ) {
				var parent = $('#'+treeId).jstree(true).get_node(item.parent);
				if ( parent.state.selected === false || item.parent === '#') {
					general.selectedNodes.groups.push(item.id);
					general.selectedNodes.groupNames.push(item.text);
					general.selectedNodes.groupsAndUsers.push(item.text);
				}
			}
		});
	},
	evt = function (mainTree, listTree) {
		var selected = [];
		
		$('#'+mainTree).on("changed.jstree", function (e, data) {
			if ( $('#'+mainTree).jstree(true).get_selected().length === 0 ) {
				buttons.changeFirstBtn(false);
			} else {
				buttons.changeFirstBtn(true);
			}
			selected = $( '#'+mainTree).jstree('get_selected', ['full'] );
			getSelection( selected, mainTree );
		});
		
		$('#fn-'+mainTree+'-open_all').on('click', function () {
			if ( !$(this).hasClass('disabled') ) {
				$('#'+mainTree).jstree(true).open_all();
			}
		});
		$('#fn-'+mainTree+'-close_all').on('click', function () {
			if ( !$(this).hasClass('disabled') ) {
			$('#'+mainTree).jstree(true).close_all();
			}
		});
		$('#fn-'+mainTree+'-select_all').on('click', function () {
			if ( !$(this).hasClass('disabled') ) {
				$('#'+mainTree).jstree(true).select_all();
			}
		});
		$('#fn-'+mainTree+'-deselect_all').on('click', function () {
			if ( !$(this).hasClass('disabled') ) {
				$('#'+mainTree).jstree(true).deselect_all();
				buttons.disable();
			}
		});
	},
	loadTree = function () {	
		$('#jstree_demo_div').remove();
		$('#fn-jstree_demo_div-parent').append( $.parseHTML('<div id="jstree_demo_div"></div>') );
		
		$.ajax({
			url : urls.mainUrl,
			type : 'GET',
			dataType : 'json',
			data : {
				action: urls.actions.GET_GROUPS, //http://100.80.0.175/cgi-bin/cpni?&action=GetMyViewAccessList&session=abc&admin=taslimi-p
				session: general.currentSession,
				base: '0',
				version: '2'	// 1= without icon	2= with icon
			}
		})
		.done(function (data) {
			var treeStructure = data[0];
			useJstree('jstree_demo_div', treeStructure);
			treeStructure.forEach(function (i) {
				general.allNodes.push(i.id);
			});
		})
		.fail(function ( data, errorTitle, errorDetail ) {
			alertify.error('Getgroups failed<br />'+errorTitle+'<br />'+errorDetail);
		});
		
		evt('jstree_demo_div');
		
	};
	
	return {
		useJstree: useJstree,
		getSelection: getSelection,
		evt: evt,
		loadTree: loadTree
	};
}()),
buttons = (function () {
	var secondClicked = false,
		inProcess = false,
		timer,
		counter = 3,
		firstBtn = $('#fn-submit-first'),
		secondBtn = $('#fn-submit-second'),
		//span = $('#fn-submit-first-text'),
		//def = span.text();
		def = firstBtn.html(),
		msgMain = 'در حال فرستادن ایمیل ها...',
		msgRemain = 'ایمیل باقی مانده است.',
		msgStarting = 'در حال شروع...',
		msgInprog = 'در جریان...',
		msgErr = 'وضعییت ناشناس.',
	changeFirstBtn = function (state) {
		if ( typeof state !== 'boolean' ) { throw new Error('changeFirstBtn():  Argument is not boolean.'); }
		
		if (state === true) { // something selected
			if (general.specificSend === false) {
				firstBtn.removeClass('disabled');
			} else if (general.specificSend === true) {
				if ( userSelect.isInputValid() ) {
					firstBtn.removeClass('disabled');
				} 
			}
		} else if (state === false) { // nothing selected
			buttons.disableBoth();
		} 
	},
	disable = function () {
		secondBtn.addClass('disabled');
		firstBtn.removeClass('button-action');
		firstBtn.addClass('button-caution');
		firstBtn.html(def);
		inProcess = false;
		clearInterval(timer);
	},
	first = function () {
		if ( $(this).hasClass('disabled') || inProcess === true ) { return; }
		
		inProcess = true;
		secondBtn.removeClass('disabled');
		secondBtn.addClass('button-action');
		firstBtn.removeClass('button-caution');
		firstBtn.addClass('button-action');
		//span.text(counter+'');
		firstBtn.text(counter+'');
		
		timer = setInterval(function () {
			counter -= 1;
			//span.text(counter+'');
			firstBtn.html(counter+'');
			if ( counter === 0 ) {
				inProcess = false;
				counter = 3;
				clearInterval(timer);
				if (secondClicked === false) {
					secondBtn.removeClass('button-action');
					secondBtn.addClass('disabled');
					firstBtn.removeClass('button-action');
					firstBtn.addClass('button-caution');
					firstBtn.html(def);
					//span.text(def);
				} else {
					//span.text(def);
				}
			}
		}, 1000);
	},
	second = function () {
		if ( $(this).hasClass('disabled') ) { return; }
		secondClicked = true;
		
		// firstBtn.attr({disabled: true});
		// secondBtn.attr({disabled: true});
		// $('.fn-treetoolbar').attr({disabled: true});
		
		confirmation.main(a.general.selectedNodes.groupNames, a.general.selectedNodes.users)
		
	},
	updatingDelayed = function () {
		setTimeout(function () {
			updating();
		}, 200);
	},
	updating = function () {
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: {
				action: urls.actions.GET_JOB_STATUS,
				session: general.currentSession,
				jobid: general.jobId
			}
		})
		.done(function (data) {
			var status = data[0].status;
			callback(status);
		})
		.fail(function () {
			updatingDelayed();
		});
	},
	callback = function (status) {
		var arr = [],
			remainingItems = 0;
		
		if ( status === false ) {
			$('.fn-remaining').addClass('hidden');
			$('.fn-progress-msg').text('کاربر وجود ندارد.');
			
			
			setTimeout(function () {
				resetEverything('کاربر وجود ندارد.', 'error');
			}, 1000);
			
			
		} else if (status === 'starting') {
			$('.fn-progress-main-msg').text(msgMain);
			$('.fn-remaining').addClass('hidden');
			$('.fn-progress-msg').text(msgStarting);
			updatingDelayed();
			
		} else if (status === 'in progress') {
			$('.fn-progress-main-msg').text(msgMain);
			$('.fn-remaining').addClass('hidden');
			$('.fn-progress-msg').text(msgInprog);
			updatingDelayed();
			
		} else if (status === '') {
			$('.fn-progress-main-msg').text(msgMain);
			$('.fn-remaining').addClass('hidden');
			$('.fn-progress-msg').text(msgErr);
			updatingDelayed();
			
		} else if (status.indexOf('/') !== -1) {
			$('.fn-progress-main-msg').text(msgMain);
			$('.fn-progress-msg').text(msgRemain);
			$('.fn-remaining').removeClass('hidden');
			arr = status.split('/')
			remainingItems = parseInt(arr[1], 10) - parseInt(arr[0], 10);
			$('.fn-remaining').text(remainingItems);
			updatingDelayed();
			
		} else if (status === 'finished') {
			resetEverything('تمامی ایمیل ها فرستاده شد.', 'success');
		}
	},
	resetEverything = function (logMsg, logType) {
		inProcess = false;
		secondClicked = false;
		alertify[logType](logMsg);
		$('.progress-bar').addClass('no-opacity');
		$('#jstree_demo_div').jstree(true).enable_node(general.allNodes);
		firstBtn.attr({disabled: false});
		firstBtn.removeClass('button-action');
		firstBtn.addClass('button-caution');
		firstBtn.html(def);
		secondBtn.attr({disabled: false});
		secondBtn.removeClass('button-action');
		secondBtn.addClass('disabled');
		$('.fn-treetoolbar').attr({disabled: false});
		$('#fn-mp-input').attr({disabled: false});
		$('.fn-us-input').attr({disabled: false});
		$('.fn-radio').attr({disabled: false});
		$('.mp-wrap > label').removeClass('lbl-disabled');
		
		$('.fn-progress-main-msg').text('');
		$('.fn-progress-msg').text('');
		$('.fn-remaining').text('');
	},
	reset = function () {
		inProcess = false;
		secondClicked = false;
		clearInterval(timer);
		secondBtn.removeClass('button-action');
		secondBtn.addClass('disabled');
		firstBtn.removeClass('button-action');
		firstBtn.addClass('button-caution');
		firstBtn.html(def);
	},
	disableBoth = function () {
		inProcess = false;
		secondClicked = false;
		clearInterval(timer);
		firstBtn.addClass('disabled');
		firstBtn.html(def);
		secondBtn.addClass('disabled');
		firstBtn.addClass('button-caution');
	};
	
	return {
		disableBoth: disableBoth,
		changeFirstBtn: changeFirstBtn,
		disable: disable,
		first: first,
		second: second,
		reset: reset,
		updating: updating,
		callback: callback
	};
}()),
confirmation = (function () {
	var bbox = function  (o) {
		bootbox.dialog({
			title: o.title,
			message: o.message,
			show: true,
			backdrop: true,
			animate: true,
			onEscape: function () {
				
			},
			buttons: o.btns
		});
	},
	callback = function () {
		$('#modal1').closeModal();
		
		var inputVal = $('.fn-us-input').val(),
			recipient,
			data;
		/*
		// first
		if ( inputVal.match(/^[.]{0,3}$/) || util.isEmptyString(inputVal) ) {
			finalVal = 'self';
		} else if ( inputVal.indexOf('@') === -1 || inputVal.slice(-3 !== 'tehran.ir') ) {
			finalVal = inputVal;
		}
		*/
		
		data = {
			action: urls.actions.SEND_MAIL_BILL,
			session: general.currentSession,
			month: general.selectedDate,
			users: general.selectedNodes.users.join(',') || '',
			groups: general.selectedNodes.groups.join(',') || ''
		};
		if ( !util.isEmptyString(general.recipient) ) {
			data.recipient = general.recipient;
		} else if ( util.isEmptyString(general.recipient) ) {
			data.recipient = inputVal;
		}/* else { inputVal is not going to be empty anymore since it got initialized during page load
			recipient = general.currentUser.username;
		}*/
		
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: data,
			beforeSend: function () {
				$('.progress-bar').removeClass('no-opacity');
				$('.fn-progress-main-msg').text('در حال بررسی...');
				
				$('#jstree_demo_div').jstree(true).disable_node(general.allNodes);
				$('#fn-mp-input').attr({disabled: true});
				$('.fn-us-input').attr({disabled: true});
				$('.fn-radio').attr({disabled: true});
				$('.mp-wrap > label').addClass('lbl-disabled');
				
			}
		})
		.done(function (data) {
			var response = data[0],
				error = '';
			if (response.jobid) {
				general.jobId = data[0].jobid;
				buttons.updating();
			} else if (response.error_msg) {
				error = response.error_msg;
				if ( error === 'empty users and groups list.') {
					// this never happens for now
				} else if ( error === 'reuested recipient not found in db!' ) {
					buttons.callback(false);
				}
				
			}
			
		})
		.fail(function () {
			alert('خطا');
		});
	},
	showMessage = function (title, message) {
		var firstBtn = $('#fn-submit-first'),
			secondBtn = $('#fn-submit-second');
		
		$('#modal1 .modal-content').empty();
		$('#modal1 .modal-content').html( '<h1>' + title + '</h1>' +
				'<p>' + message + '</p>' );
		$('#modal1').openModal({
			dismissible: false,
			opacity: .5,
			in_duration: 300,
			out_duration: 200,
			ready: function () {
				firstBtn.attr({disabled: true});
				secondBtn.attr({disabled: true});
				$('.fn-treetoolbar').attr({disabled: true});
				buttons.reset();
			},
			complete: function () {
				firstBtn.attr({disabled: false});
				secondBtn.attr({disabled: false});
				$('.fn-treetoolbar').attr({disabled: false});
				
			}
		});
		
		/*bbox({
			title: title,
			message: message,
			btns: {
				success: {
					label: 'انجام بده',
					className: "btn-primary",
					callback: callback
				},
				"Danger!": {
					label: 'برگرد',
					className: "btn-default",
					callback: function () {
						
					}
				
				}
			}
		});*/
		
		
	},
	main = function (groups, users) {
		var title = 'فرستادن ایمیل ها',
			message = '',
			inputVal = $('.fn-us-input').val();
		
		message += 'شما می خواهید&nbsp;';
		message += '<span>'+general.selectedNodes.userCount+' </span>';
		message += 'ایمیل به&nbsp;&nbsp;';
		
		
		if (general.recipient) {
			message += general.recipient;
		} else if ( (!general.recipient  ||  util.isEmptyString(general.recipient)) && !util.isEmptyString(inputVal) ) {
			message += inputVal;
		} else {
			message += general.currentUser.username;
		}
		message += '&nbsp;&nbsp;ارسال کنید:';
		
		message += '<br /><br />';
		if (users.length !== 0 && groups.length === 0) {
			message += 'کاربران :';
			message += '<br /><br />';
			message += users.join('    <br />    ');
		} else if (groups.length !== 0 && users.length === 0) {
			message += 'پوشه ها :';
			message += '<br /><br />';
			message += groups.join('<br />');
		} else if ( groups.length !== 0 && users.length !== 0 ) {
			message += 'کاربران :';
			message += '<br /><br />';
			message += users.join('<br />');
			message += '<br /><br />';
			message += 'پوشه ها :';
			message += '<br /><br />';
			message += groups.join('<br />');
		}
		showMessage(title, message);
	};

	return {
		callback: callback,
		main: main,
		bbox: bbox
	};

}()),
monthpicker = (function () {
	var currentYear = parseInt( $('.fn-mp-year').text(), 10 ),
	initialize = function () {
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: {
				action: urls.actions.GET_DATE
			}
		})
		.done(function (data) {
			var response = data[0],
				month = response.month.number +'',
				year = response.year.full +'';
			general.selectedDate = year + month;
			general.currentYear = response.year.full;
			$('#fn-mp-input').val( year.slice(-2) + '/' + month);
		})
		.fail(function () {
			alertify.error('GetDate failed.');
		});
	},
	show = function (e) {
		e.stopPropagation();
		$('.monthpicker').removeClass('hidden opacity-none');
		$('.monthpicker').addClass('visible opacity-full');
	},
	hide = function (e) {
		var el = $('.monthpicker');
		if( !$(e.target).closest('.monthpicker').length ) {
			if( el.is(":visible") ) {
				el.removeClass('visible opacity-full');
				el.addClass('opacity-none hidden');
			}
		}
	},
	next = function () {
		currentYear += 1;
		if ( currentYear <= general.currentYear ) {
			$('.fn-mp-year').text(''+currentYear);
		} else {
			currentYear = general.currentYear;
		}
	},
	prev = function () {
		currentYear -= 1;
		$('.fn-mp-year').text(currentYear+'');
	},
	main = function () {
		var year = $('.fn-mp-year').text(),
			month = $(this).data().val;
		general.selectedDate = year + month;
		$('#fn-mp-input').val( year.slice(-2) + '/' + month);
		$('.monthpicker').removeClass('visible opacity-full');
		$('.monthpicker').addClass('opacity-none hidden');
	};
	
	return {
		initialize: initialize,
		next: next,
		prev: prev,
		show: show,
		hide: hide,
		main: main
	};
}()),
userSelect = (function () {
	var isInputValid = function () {
		var el = $('.fn-us-input'),
			cond = ( el.prop('disabled') === false   &&
					!util.isEmptyString( el.val() )  );
		return (cond) ? true : false;
	},
	unsetRecep = function () {
		var userInputVal = $('.fn-us-input').val()
		general.recipient = '';
		if ( util.isEmptyString(userInputVal) ) {
			buttons.disableBoth();
		} else if ( general.selectedNodes.userCount !== 0 ) {
			$('#fn-submit-first').removeClass('disabled');
			
		}
	},
	main = function () {
		var id = $(this).attr('id');
		if ( id === 'self-radio' ) {
			general.specificSend = false;
			general.recipient = general.currentUser.username;
			$('.fn-us-input').val('');
			$('.fn-us-input').attr({disabled: true});
			if ( general.selectedNodes.userCount !== 0 ) {
				$('#fn-submit-first').removeClass('disabled');
				
			}
		} else if ( id === 'user-select-radio' ) {
			general.recipient = '';
			general.specificSend = true;
			$('.fn-us-input').attr({disabled: false});
			if ( general.selectedNodes.userCount === 0 || !isInputValid() ) {
				buttons.disableBoth();
			}
		}
	};
	
	return {
		isInputValid: isInputValid,
		unsetRecep: unsetRecep,
		main: main
	};
}()),
currentUser = (function () {
	var updateProfile = function (user) {
		$('.fn-current_user-profpic').attr({src: user.photo});
		$('.fn-current_user-title').text(user.title);
		$('.fn-current_user-fullnamefa').text(user.fullnameFa);
	};
	return {
		updateProfile: updateProfile
	};
}()),
autoc = (function () {
	var currentItem = 0,
	setFocus = function (key) {
		if (typeof key !== 'number') { throw new Error('setFocus():  Argument is not a number.'); }
		var up = false,
			down = false,
			currentItemStr = '',
			el,
			items = $('.autoc-suggestions > tbody').children().length;
			
		if (key === 38) {
			up = true;  down = false;
		} else if (key === 40) {
			up = false; down = true;
		}
		
		if ( items !== 0 ) {
			if (down) {
				currentItem += 1;
				if (currentItem > items) {
					currentItem = 1;
				}
				currentItemStr = currentItem + '';
				$('.focused').removeClass('focused');
				el = $('#fn-num-' + currentItemStr );
				el.addClass('focused');
				$('#fn-autocomplete').val( el.contents().filter(':first-child').data().username );
				
			} else if (up) {
				
				currentItem -= 1;
				if (currentItem < 1 ) {
					currentItem = items;
				}
				currentItemStr = currentItem + '';
				$('.focused').removeClass('focused');
				el = $('#fn-num-' + currentItemStr );
				el.addClass('focused');
				$('#fn-autocomplete').val( el.contents().filter(':first-child').data().username );
				
			}
		}
	},
	createHtml = function (arr) {
		//var html = '';
		var baseHtml = '',
			els = [],
			tr,
			counter = 1;
			
		baseHtml = util.getCommentsInside('.autoc-suggestions')[0].nodeValue.trim();
		
		arr.forEach(function (i) {
			var formatted = general.formatUserInfo(i),
				trId = '';
			tr = $.parseHTML(baseHtml)[0];
			tr = $(tr);
			if (formatted.photo) {
				tr.find('img')				.attr( 'src', formatted.photo	);
			}
			tr.find('.autoc-fullname-fa')	.text( formatted.fullnameFa		);
			tr.find('.autoc-title')			.text( formatted.title			);
			// tr.find('.autoc-username')		.text( formatted.username		);
			tr.find('.autoc-email')			.text( formatted.email			);
			tr.find('.item-wrap')			.attr('data-username', formatted.username);
			
			trId = tr.attr('id');
			tr.attr('id', trId + counter + '');
			
			els.push(tr[0]);
			counter += 1;
			/*
			html +=	'<tr>';
			html +=		'<td class="item-wrap">';
			html +=				'<img src="'+ formatted.photo+ '" alt="Profile Pic"/>';
			html +=				'<span class="autoc-fullname-fa">'	+ formatted.fullnameFa	+ '</span><br />';
			html +=				'<span class="autoc-title">'		+ formatted.title	+ '</span><br />';
			//html +=				'<span class="autoc-username">'		+ formatted.username	+ '</span><br />';
			html +=				'<span class="autoc-email">'		+ formatted.email	+ '</span>';
			html +=		'</td>';
			html +=	'</tr>';
			*/
		});
		$('.autoc-suggestions > tbody').empty();
		currentItem = 0;
		els.forEach(function (i) {
			$('.autoc-suggestions > tbody').append(i);
		});
		//$('.suggestions > tbody').html(html);
	},
	makeAjax = function (term) {
		$.ajax({
			url: urls.mainUrl,
			type: 'GET',
			dataType: 'json',
			data: {
				action: urls.actions.AC_USERNAME,
				session: general.currentSession,
				term: term
			},
			beforeSend: function () {
				
			}
		})
		.done(function (data) {
			var resp = data[0],
				key,
				arr = [];
			
			for (key in resp) {
				if ( resp.hasOwnProperty(key) ) {
					arr.push( resp[key] );
				}
			}
			$('.autoc-suggestions').removeClass('no-display');
			createHtml(arr);
		})
		.fail(function () {
			
		});
	},
	hide = function (e) {
		var el = $('.autoc'),
			inputVal = $('#fn-autocomplete').val();
			
		if( !$(e.target).closest('.autoc').length ) {
			if( !el.hasClass('no-display') ) {
				$('.autoc-suggestions').addClass('no-display');
				if ( util.isEmptyString(inputVal) ) {
					$('#fn-autocomplete').val('');
				}
			}
		}
	},
	keyup = function (e) {
		var arrowKey = false,
			enterKey = false,
			term = '',
			key = e.which,
			inputVal = $(this).val().trim();
			
		if (key === 37 || key === 38 || key === 39 || key === 40) {
			arrowKey = true;
			
		}
		if (key === 13) {
			enterKey = true;
			if ( $('.autoc-suggestions > tbody').children().length !== 0 ) {
				$(this).val( $('.focused').contents().filter(':first-child').data().username );
				$('.autoc-suggestions > tbody').empty();
				currentItem = 0;
				submit( $('#fn-autocomplete').val() );
			}
		}
		
		if ( util.isEmptyString(inputVal) ) {
			$('.autoc-suggestions > tbody').empty();
			currentItem = 0;
		} else if ( !arrowKey && !util.isEmptyString(inputVal) && !enterKey) {
			term = $(this).val().trim();
			makeAjax( term );
		}
	},
	keydown = function (e) {
		// e.which === 37 // left
		// e.which === 39 // right
		// e.which === 38 // up
		// e.which === 40 // down
		var key = e.which;
		if ( key === 38 || key === 40) {
			setFocus(key);
		}
	},
	mouseenter = function () {
		var id = '',
			numStr = '',
			num = 0;
		id = $(this).attr('id');
		numStr = id.match(/[-]{1}\d{0,3}$/)[0].slice(1);
		num = parseInt(numStr, 10);
		currentItem = num;
		
		$('.focused').removeClass('focused');
		$(this).addClass('focused');
		//$('#fn-autocomplete').val($(this).find('.item-wrap').data().username);
	},
	mouseleave = function () {
		currentItem = 0;
		$(this).removeClass('focused');
		//$('#fn-autocomplete').val($(this).find('.item-wrap').data().username);
	},
	click = function () {
		$('.autoc-suggestions').addClass('no-display');
		$('#fn-autocomplete').val( $(this).find('.item-wrap').data().username );
		submit( $('#fn-autocomplete').val() );
	},
	submit = function (username) {
		//profile.makeAjax(username);
	},
	defEvt = function () {
		$('body').on('click', hide);
		$('#fn-autocomplete').on('keyup', keyup);
		$('#fn-autocomplete').on('keydown', keydown);
		$('.autoc').on('mouseenter', '.fn-autoc-item', mouseenter);
		$('.autoc').on('mouseleave', '.fn-autoc-item', mouseleave);
		$('.autoc').on('click', '.fn-autoc-item', click);
	};

	return {
		defEvt: defEvt
	};
}()),
misc = (function () {
	var time = (function () {
		var countTime = function (timestamps) {
			var date = new Date(timestamps),
				hour = date.getHours(),
				minute = date.getMinutes(),
				second = date.getSeconds(),
				secondCounter = second,
				minuteCounter = minute,
				hourCounter = hour,
				elSecond = $('.fn-time-second'),
				elMinute = $('.fn-time-minute'),
				elHour = $('.fn-time-hour');
			setInterval(function () {
				if (secondCounter === 60) {
					minuteCounter += 1;
					elMinute.html( (minuteCounter <= 9) ? '0'+minuteCounter : ''+minuteCounter );
					secondCounter = 0;
					elSecond.html( (secondCounter <= 9) ? '0'+secondCounter : ''+secondCounter );
					secondCounter += 1;
				} else {
					elSecond.html( (secondCounter <= 9) ? '0'+secondCounter : ''+secondCounter );
					secondCounter += 1;
				}
				
				if (minuteCounter === 60 ) {
					minuteCounter = 0;
					elMinute.html( (minuteCounter <= 9) ? '0'+minuteCounter : ''+minuteCounter );
					hourCounter += 1;
					elHour.html( (hourCounter <= 9) ? '0'+hourCounter : ''+hourCounter );
				}
				
				if ( hourCounter === 24 ) {
					hourCounter = 0;
					elHour.html( (hourCounter <= 9) ? '0'+hourCounter : ''+hourCounter );
				}
				
			}, 1000);
		};
		return function () {
			
			$.ajax({
				url: urls.mainUrl,
				type: 'GET',
				dataType: 'json',
				data: {
					action: urls.actions.GET_DATE
				}
			})
			.done(function (data) {
				var response= data[0],
				timestamp = parseInt(response.timestamp, 10),
					d = new Date(timestamp),
					week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
					month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
					weekday = week[ d.getDay() ],
					monthNumber = d.getMonth(),
					monthName = month[ monthNumber ];
					
				$('.header-date').removeClass('hidden');
				
				$('.fn-endate-dayname').html(weekday.toUpperCase());
				$('.fn-endate-monthnumber').html( monthNumber );
				$('.fn-endate-monthname').html( monthName.toUpperCase() );
				$('.fn-endate-year').html( d.getFullYear() );
				
				$('.fn-fadate-dayname').html(response.day.weekday.name);
				$('.fn-fadate-daynumber').html(response.day.monthday.name);
				$('.fn-fadate-monthname').html(response.month.name);
				var year = '' + response.year.full;
				$('.fn-fadate-year').html( year );
				$('.fn-time-hour').html( d.getHours() );
				$('.fn-time-minute').html( d.getMinutes() );
				$('.fn-time-second').html( d.getSeconds() );
				//countTime(timestamp);
				
			})
			.fail(function () {
				$('.a-nav-time').css({visibility: 'hidden'});
			});
		};
	}());
	return {
		time: time
	};
}()),
initializeMaterial = function () {
	$('#modal1 button').on('click', confirmation.callback);
};


return {
	urls: urls,
	util: util,
	general: general,
	initializeMaterial: initializeMaterial,
	checkSession:checkSession,
	tree: tree,
	profile: profile,
	buttons: buttons,
	confirmation: confirmation,
	monthpicker: monthpicker,
	userSelect: userSelect,
	currentUser: currentUser,
	autoc: autoc,
	misc: misc
};
}());
