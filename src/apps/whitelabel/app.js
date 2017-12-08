define(function(require){
	var $ = require('jquery'),
		monster = require('monster');

	require([
		'fileupload'
	]);

	var app = {
		name: 'whitelabel',

		css: [ 'app'],

		i18n: {
			'en-US': { customCss: false },
			'ru-RU': { customCss: false }
		},

		requests: {
			/*
			'google.getUser': {
				apiRoot: 'http://api.google.com/',
				url: 'users',
				verb: 'PUT'
			}*/
		},

		load: function(callback){
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		vars: {},

		initApp: function(callback) {
			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});

			self.initHandlebarsHelpers();
		},

		initHandlebarsHelpers: function() {
			Handlebars.registerHelper('inc', function(value, options) {
				return parseInt(value) + 1;
			});

			Handlebars.registerHelper('compare', function (lvalue, operator, rvalue, options) {
				var operators, result;

				if (arguments.length < 3) {
					throw new Error('Handlerbars Helper \'compare\' needs 2 parameters');
				}

				if (options === undefined) {
					options = rvalue;
					rvalue = operator;
					operator = '===';
				}

				operators = {
					'==': function (l, r) { return l == r; },
					'===': function (l, r) { return l === r; },
					'!=': function (l, r) { return l != r; },
					'!==': function (l, r) { return l !== r; },
					'<': function (l, r) { return l < r; },
					'>': function (l, r) { return l > r; },
					'<=': function (l, r) { return l <= r; },
					'>=': function (l, r) { return l >= r; },
					'typeof': function (l, r) { return typeof l == r; }
				};

				if (!operators[operator]) {
					throw new Error('Handlerbars Helper \'compare\' doesn\'t know the operator ' + operator);
				}

				result = operators[operator](lvalue, rvalue);

				if (result) {
					return options.fn(this);
				} else {
					return options.inverse(this);
				}

			});
		},

		render: function(_container, tabKeyword) {
			var self = this,
				$container = _container || $('#monster_content');

			if(typeof(tabKeyword) === 'undefined') {
				tabKeyword = 'general';
			}

			var html = $(monster.template(self, 'main', {}));
			$container.empty().append(html);

			self.getWhiteLabelData(function(whitelabelData) {
				self.renderWhitelabelTab(tabKeyword, whitelabelData);
			});

			self.sidebarMenuInit();
		},

		sidebarMenuInit: function() {
			var self = this;

			$('.js-sidebar-menu-link').on('click', function(e) {
				e.preventDefault();

				var screenKeyword = $(this).data('screen');
				self.getWhiteLabelData(function(whitelabelData) {
					self.renderWhitelabelTab(screenKeyword, whitelabelData);
				});
			})
		},

		renderWhitelabelTab: function(tabKeyName, data) {
			var self = this;
			var $parent = $('#whitelabel-content');

			switch(tabKeyName) {
				case 'advanced':
					self.advancedScreenRender(data, $parent);
					break;
				case 'general':
				default:
					self.generalScreenRender(data, $parent);
			}

			monster.ui.tooltips($parent, {
				options: {
					placement: 'right',
					container: 'body'
				}
			});
		},

		generalScreenRender: function(data, $parent) {
			var self = this;

			$('.js-sidebar-menu-link')
				.removeClass('active')
				.filter('[data-screen="general"]').addClass('active');

			var $html = $(monster.template(self, 'screen-general',
				$.extend(true, {
					i18n: self.i18n.active(),
					logo: data.logo,
					icon: data.icon
				}, data)
				));

			$parent.empty().append($html);

			if (data.doc) {
				if (data.doc.hasOwnProperty('custom_welcome_message')) {
					$parent.find("#custom_welcome_message").val(data.doc.custom_welcome_message);
				}
			}
			monster.ui.validate($("#general-form"));

			self.generalScreenBindEvents($parent, data)
		},

		advancedScreenRender: function(data, $parent) {
			var self = this;

			$('.js-sidebar-menu-link')
				.removeClass('active')
				.filter('[data-screen="advanced"]').addClass('active');

			var $html = $(monster.template(self, 'screen-advanced',
				$.extend(true, {
					i18n: self.i18n.active()
				}, self.advancedScreenFormatData(data))
			));

			$parent.empty().append($html);

			$parent.find(".choices-list").sortable({
				items : ".choices-element.clickable-box",
				cancel : ".choices-element.flat-box"
			}).disableSelection();

			monster.ui.validate($parent.find("#advanced-form"));

			self.advancedScreenBindEvents($parent, data);
		},

		advancedScreenFormatData : function(data) {
			var self = this;
			var i18n = self.i18n.active().whitelabel;
			var choices = [{
				key : 'useBlended',
				name : i18n.advanced.carrier.choices.list.useBlended
			}, {
				key : 'useReseller',
				name : i18n.advanced.carrier.choices.list.useReseller
			}, {
				key : 'byoc',
				name : i18n.advanced.carrier.choices.list.byoc
			}];

			var resultData = $.extend({
				portAuthority : self.accountId,
				selectedChoices : [],
				unselectedChoices : []
			}, data);

			if(resultData.doc && resultData.doc.carrier && resultData.doc.carrier.choices) {
				$.each(resultData.doc.carrier.choices, function(i, value) {
					resultData.selectedChoices.push({
						key : value,
						name : i18n.advanced.carrier.choices.list[value]
					});
				});

				$.each(choices, function(i, choice) {
					if (resultData.doc.carrier.choices.indexOf(choice.key) < 0) {
						resultData.unselectedChoices.push(choice);
					}
				});
			} else {
				resultData.selectedChoices = choices
			}

			return resultData;
		},

		generalScreenBindEvents: function($parent, whitelabelData) {
			var self = this,
				allowedTypes = ['image/png', 'image/jpeg'],
				logo = null,
				icon = null;

			var resetLogo = function() {
				var $logoPreview = $parent.find('.js-logo-preview');
				var logoCSSurl = $logoPreview.data('original-logo') ? 'url(' + $logoPreview.data('original-logo') + ')' : '';
				if (logoCSSurl) {
					$logoPreview.css('background-image', logoCSSurl).toggleClass('image-empty', false);
				} else {
					$logoPreview.css('background-image', 'none').toggleClass('image-empty', true);
				}
				$parent.find('.js-reset-logo').hide();
				$parent.find('.logo-upload-div .file-upload input').val('');
				logo = null;
			};

			var resetFavicon = function() {
				var $faviconPreview = $parent.find('.js-favicon-preview');
				var faviconCSSurl = $faviconPreview.data('original-favicon') ? 'url(' + $faviconPreview.data('original-favicon') + ')' : '';
				if (faviconCSSurl) {
					$faviconPreview.css('background-image', faviconCSSurl).toggleClass('image-empty', false);
				} else {
					$faviconPreview.css('background-image', 'none').toggleClass('image-empty', true);
				}
				$parent.find('.js-reset-favicon').hide();
				$parent.find('.favicon-upload-div .file-upload input').val('');
				icon = null;
			};

			$parent.find('#company-logo').fileUpload({
				inputOnly : true,
				wrapperClass : 'file-upload input-append',
				btnClass : 'btn',
				mimeTypes : allowedTypes,
				success : function(data) {
					var imageObj = new Image;
					imageObj.onload = function(e) {
						if (this.width <= 192 && this.height <= 62) {
							$parent.find('.js-logo-preview').css('background-image', 'url(' + imageObj.src + ')').removeClass('image-empty');
							$parent.find('.js-reset-logo').show();
						} else {
							monster.ui.alert('error', self.i18n.active().whitelabel.alertMessages.logoWrongSize);
							resetLogo();
						}
					};
					logo = data[0].file;
					imageObj.src = data[0].file;
				},
				error : function(config) {
					if (config.hasOwnProperty('mimeTypes')) {
						if (config.mimeTypes.length > 0) {
							monster.ui.alert('error', self.i18n.active().whitelabel.alertMessages.logoWrongType);
						}
					}
					resetLogo();
				}
			});

			$parent.find('#company_icon_input').fileUpload({
				inputOnly : true,
				wrapperClass : 'file-upload input-append',
				btnClass : 'btn',
				success : function(data) {
					var imageObj = new Image;

					imageObj.onload = function(e) {
						if (this.width <= 64 && this.height <= 64) {
							$parent.find('.js-favicon-preview').css('background-image', 'url(' + imageObj.src + ')').removeClass('image-empty');
							$parent.find('.js-reset-favicon').show();
						} else {
							monster.ui.alert('error', self.i18n.active().alertMessages.faviconWrongSize);
							resetFavicon();
						}
					};
					icon = data[0].file;
					imageObj.src = data[0].file;
				},
				error : function(textStatus) {
					resetFavicon();
				}
			});

			$parent.find('.js-reset-logo').on('click', resetLogo);

			$parent.find('.js-reset-favicon').on('click', resetFavicon);

			$parent.find('#custom_welcome').on('change', function() {
				if ($(this).prop('checked')) {
					$parent.find('.welcome-message-container').slideDown();
				} else {
					$parent.find(".welcome-message-container").slideUp();
				}
			});

			$parent.find('form').on('submit', function(e){
				e.preventDefault();
				self.generalScreenFormSave($(this), whitelabelData, logo, icon);
			});

			$parent.find('.js-save').on('click', function(e) {
				var $form = $(this).closest('form');
				e.preventDefault();
				self.generalScreenFormSave($form, whitelabelData, logo, icon);

			});

			$parent.find('.js-remove').on('click', function() {
				monster.ui.confirm(data.i18n.active().alertMessages.deleteConfirm, function() {
					self.callApi({
						resource : 'whitelabel.delete',
						data : {
							accountId : self.accountId
						},
						success : function(textStatus) {
							self.render();
						},
						error : function(textStatus) {
							self.render();
						}
					});
				});
			});
		},

		advancedScreenBindEvents: function($parent, data) {
			var self = this;

			$parent.find('input[name="port.authority"]').on('change', function() {
				if ($(this).val()) {
					$parent.find('.js-advanced-port-info').show();
				} else {
					$parent.find('.js-advanced-port-info').hide();
				}
			});

			$parent.find('.js-choices-element-ckb').on('change', function(e) {
				var $target = $(this);
				var $container = $target.parents('.js-choices-element');

				if ($container.hasClass('js-clickable-box') && $parent.find('.js-choices-element.js-clickable-box').length <= 1) {
					$target.prop('checked', true);
				} else {
					var $table = src.find('.js-choices-element.js-flat-box:first');
					if ($table.length) {
						$table.before($container);
					} else {
						$parent.find('.js-choices-element.js-clickable-box:last').after($container);
					}
					$container.toggleClass('js-flat-box').toggleClass('js-clickable-box');
				}
			});

			$parent.find('.js-save').on('click', function(e) {
				e.preventDefault();
				if (monster.ui.valid($parent.find('#advanced-form'))) {
					var formData = monster.ui.getFormData('advanced-form');
					var resultData = $.extend(true, {}, data.doc, formData);
					resultData.hide_port = 'true' === resultData.hide_port;
					if (!resultData.carrier) {
						resultData.carrier = {};
					}
					resultData.carrier.choices = $parent.find('.choices-element.clickable-box').map(function() {
						return $(this).data('value');
					}).get();

					if(resultData.port.authority === '') {
						delete resultData.port.loa;
						delete resultData.port.resporg;
						delete resultData.port.support_email;
					}

					self.callApi({
						resource : 'whitelabel.update',
						data : {
							accountId : self.accountId,
							data : resultData
						},
						success : function(textStatus) {
							self.render(null, 'advanced');
						}
					});
				}
			});
		},

		generalScreenFormSave: function($form, whitelabelData, logo, icon) {
			var self = this;

			if(monster.ui.valid($form)) {
				var task = self.generalScreenFormatData(monster.ui.getFormData("general-form"), whitelabelData.doc);

				self.callApi({
					resource : whitelabelData.doc ? 'whitelabel.update' : 'whitelabel.create',
					data : {
						accountId : self.accountId,
						data : task
					},
					success : function(textStatus) {
						var obj = {};
						var callback = function() {
							self.render();
						};
						if(logo) {
							obj.logo = function(callback) {
								self.callApi({
									resource : 'whitelabel.updateLogo',
									data : {
										accountId : self.accountId,
										data : logo
									},
									success : function(feed) {
										callback(null, feed);
									},
									error : function(textStatus) {
										callback(null, textStatus);
									}
								});
							};
						}
						if(icon) {
							obj.icon = function(callback) {
								self.callApi({
									resource : 'whitelabel.updateIcon',
									data : {
										accountId : self.accountId,
										data : icon
									},
									success : function(feed) {
										callback(null, feed);
									},
									error : function(textStatus) {
										callback(null, textStatus);
									}
								});
							};
						}
						if ($.isEmptyObject(obj)) {
							callback();
						} else {
							monster.parallel(obj, callback);
						}
					}
				});
			}
		},

		generalScreenFormatData: function(settings, opts) {
			settings.hide_powered = !settings.hide_powered;
			settings = $.extend(true, {}, opts, settings);

			if(settings.callReportEmail === '') {
				delete settings.callReportEmail
			}

			if(settings.language === 'auto') {
				delete settings.language
			}

			return settings;
		},

		getWhiteLabelData: function(callback) {
			var self = this;

			monster.parallel({
				doc: function (callback) {
					self.callApi({
						resource: 'whitelabel.get',
						data: {
							accountId: self.accountId,
							generateError: false
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				},
				logo: function (callback) {
					var xmlhttp = new XMLHttpRequest;
					var logoUrl = self.apiUrl + 'accounts/' + self.accountId + '/whitelabel/logo?auth_token=' + monster.util.getAuthToken();
					xmlhttp.open('GET', logoUrl, true);
					xmlhttp.onreadystatechange = function() {
						if (4 === xmlhttp.readyState) {
							if (200 === xmlhttp.status) {
								if(typeof(callback) === 'function') {
									callback(null, logoUrl);
								}
							} else {
								if(typeof(callback) === 'function') {
									callback(null, null);
								}
							}
						}
					};
					xmlhttp.send();
				},
				icon: function (callback) {
					self.callApi({
						resource: 'whitelabel.getIcon',
						data: {
							accountId: self.accountId,
							generateError: false,
							dataType : "*"
						},
						success: function (response) {
							var iconUrl = self.apiUrl + 'accounts/' + self.accountId + '/whitelabel/icon?auth_token=' + monster.util.getAuthToken();
							if(typeof(callback) === 'function') {
								callback(null, iconUrl);
							}
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				},
				passwordRecovery: function (callback) {
					self.callApi({
						resource: 'whitelabel.getNotification',
						data: {
							accountId: self.accountId,
							generateError: false,
							notificationId: 'password_recovery'
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				}
			}, function (err, results) {
				console.log('Results:');
				console.log(results);

				if (results.doc
					&& results.passwordRecovery
					&& results.passwordRecovery.enabled === false) {
					results.doc.hidePasswordRecovery = true;
				}

				delete results.passwordRecovery;

				if(typeof(callback) === 'function') {
					callback(results);
				}
			});
		}
	};

	return app;
});
