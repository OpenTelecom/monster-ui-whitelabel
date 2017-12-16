define(function(require){
	var $ = require('jquery'),
		monster = require('monster'),
		assert = require("toastr");

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
				case 'templates':
					self.templatesScreenRender(data, $parent);
					break;
				case 'dns':
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

			self.menuSetActiveItem('general');

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

		templatesScreenRender: function(whitelabelData, $parent) {
			var self = this;
			$parent = $parent ? $parent : $('#whitelabel-content');

			self.menuSetActiveItem('templates');
			self.templatesScreenGetList(function(templates){
				var $html = $(monster.template(self, 'screen-templates', {
					i18n: self.i18n.active(),
					whitelabelTemplates: self.templatesScreenFormatData(templates)
				}));
				$parent.empty().append($html);
				monster.ui.tooltips($parent);
				self.templatesScreenBindEvents({
					container: $parent,
					templates: templates,
					whitelabelData: whitelabelData
				});
			});
		},

		templatesScreenFormatData: function(data) {
			var result = [];

			$.each(data, function(categoryKey, categoryData) {
				var arr = $.map(categoryData.templates, function(value, key) {
					return $.extend(true, {
						templateKey : key
					}, value);
				});

				result.push({
					categoryKey: categoryKey,
					categoryName: categoryData.categoryName,
					templates: arr.sort(function (a, b) {
						var aName = a.templateName.toLowerCase();
						var bName = b.templateName.toLowerCase();
						return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
					})
				});
			});

			result.sort(function (a, b) {
				var aName = a.categoryName.toLowerCase();
				var bName = b.categoryName.toLowerCase();
				return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
			});

			return result;
		},

		templatesScreenGetList: function(callback) {
			var self = this;
			var templateList = {};
			self.callApi({
				resource : 'whitelabel.listNotifications',
				data : {
					accountId : self.accountId
				},
				success : function(response, textStatus) {
					if(response.data && response.data.length) {
						var i18n = self.i18n.active().whitelabel;

						$.each(response.data, function(i, options) {
							if(!options.hasOwnProperty('category')) {
								options.category = 'misc';
							}
							if(!templateList.hasOwnProperty(options.category)) {
								templateList[options.category] = {
									categoryName : i18n.templates.templateCategories[options.category] || options.category,
									templates : {}
								};
							}
							templateList[options.category].templates[options.id] = {
								templateName : i18n.templates.templateNames[options.id] || (options.friendly_name || options.id),
								status : options.hasOwnProperty('enabled') && options.enabled === false ? 'disabled' : options.account_overridden ? 'custom' : 'default',
								macros : options.macros
							};
						});
						if(typeof(callback) === 'function') {
							callback(templateList);
						}
					}
				}
			});
		},

		templatesScreenBindEvents: function(args) {
			var self = this;
			var $container = args.container;
			var templates = args.templates;
			var whitelabelData = args.whitelabelData;

			$container.find('.js-category-header').on('click', function() {
				var $el = $(this);
				$el.parents('.js-category-container').toggleClass('open');
				$el.find('i').toggleClass('fa-caret-down').toggleClass('fa-caret-right');
				$el.siblings('.js-category-content').stop().slideToggle();
			});

			$container.find('.js-template-header').on('click', function() {
				var $templateItem = $(this).parents('.js-template-container');
				var tpl = $templateItem.data('template');
				var category = $templateItem.parents('.js-category-container').data('category');
				self.templatesScreenTemplateEditionRender({
					container: $templateItem,
					templateBaseData: templates[category].templates[tpl],
					whitelabelData: whitelabelData
				});
			});
		},

		templatesScreenTemplateEditionRender: function(args){
			var self = this;

			var $container = args.container;
			var templateBaseData = args.templateBaseData;
			var whitelabelData = args.whitelabelData;
			var templateKeyword = $container.data('template');

			self.templatesScreenGetTemplate(templateKeyword, function(notificationData) {
				var actual = $.extend(true, {
					templateKey : templateKeyword
				}, templateBaseData, notificationData);

				var $html = $(monster.template(self, 'template-content',
					self.templatesScreenTemplateEditionFormatData(actual)));
				var menuItems = [];

				$.each(templateBaseData.macros, function(i, data) {
					menuItems.push({
						text : data.friendly_name,
						args : i
					});
				});

				monster.ui.tooltips($html);

				$html.find('#' + templateKeyword + '_text_body').val(notificationData.text);
				$container.find('.js-template-header').hide();
				$container.find('.js-template-content').empty().append($html).show();

				monster.ui.wysiwyg($container.find('.js-wysiwyg-container'), {
					macro : {
						options : menuItems
					}
				}).html(notificationData.html);

				$container.toggleClass('open', true);

				if($html.offset()) {
					$('html, body').animate({
						scrollTop : $html.offset().top - 30
					}, 300);
				}

				self.templatesScreenTemplateEditionBindEvents($.extend(true, {
					template : $html,
					templateData : notificationData,
					templateKey : templateKeyword,
					whitelabelData : whitelabelData
				}, args));
			});
		},

		templatesScreenTemplateEditionFormatData: function(data){
			data.data.to.email_addresses = data.data.to.email_addresses.join(', ');
			data.data.bcc.email_addresses = data.data.bcc.email_addresses.join(', ');
			return data;
		},

		templatesScreenGetTemplate: function(templateName, callback){
			var self = this;
			var message = {
				to: {
					type : 'original',
					email_addresses : []
				},
				bcc: {
					type : 'specified',
					email_addresses : []
				},
				from: '',
				subject: '',
				enabled: true,
				template_charset: 'utf-8'
			};

			self.callApi({
				resource : 'whitelabel.getNotification',
				data : {
					accountId : self.accountId,
					notificationId : templateName
				},
				success : function(response, textStatus) {
					monster.parallel({
						text : function(callback) {
							self.callApi({
								resource : "whitelabel.getNotificationText",
								data : {
									accountId : self.accountId,
									notificationId : templateName
								},
								success : function(resp, textStatus) {
									if(typeof(callback) === 'function') {
										callback(null, resp);
									}
								},
								error : function(textStatus, jqXHR) {
									if(typeof(callback) === 'function') {
										callback(null, null);
									}
								}
							});
						},
						html : function(callback) {
							self.callApi({
								resource : 'whitelabel.getNotificationHtml',
								data : {
									accountId : self.accountId,
									notificationId : templateName
								},
								success : function(feed, textStatus) {
									if(typeof(callback) === 'function') {
										callback(null, feed);
									}
								},
								error : function(textStatus, jqXHR) {
									if(typeof(callback) === 'function') {
										callback(null, null);
									}
								}
							});
						}
					}, function(err, result) {
						result.data = $.extend(true, message, response.data);
						if(typeof(callback) === 'function') {
							callback(result);
						}
					});
				},
				error : function(textStatus, jqXHR) {
					if(typeof(callback) === 'function') {
						callback({
							data : message
						});
					}
				}
			});
		},

		templatesScreenTemplateEditionBindEvents: function(args){
			var self = this;
			var $template = args.template;
			var templateData = args.templateData;
			var templateKeyword = args.templateKey;
			var whitelabelData = args.whitelabelData;

			var show = function(updateScreen) {
				if (updateScreen) {
					self.templatesScreenRender(whitelabelData);
				} else {
					args.container.toggleClass('open', false);
					args.container.find('.js-template-content').empty().hide();
					args.container.find('.js-template-header').show();
				}
			};

			var getFormattedFormData = function() {
				var data = monster.ui.getFormData(templateKeyword + '_form');
				var toEmails = data.to.email_addresses.trim().replace(/[;\s,]+/g, ',');
				var bccEmails = data.bcc.email_addresses.trim().replace(/[;\s,]+/g, ',');
				data.to.type = $template.find('.to-group .recipient-radio.active').data('value');
				data.to.email_addresses = toEmails.length ? toEmails.split(',') : [];
				data.bcc.type = $template.find('.bcc-group .recipient-radio.active').data('value');
				data.bcc.email_addresses = bccEmails.length ? bccEmails.split(',') : [];
				return $.extend(true, {}, templateData.data, data);
			};

			var $switch = $template.find('.js-switch');

			$switch.on('change', function() {
				$template.find('.content').toggleClass('disabled', !$(this).prop('checked'));
			});

			$template.find('.recipient-radio').on('click', function() {
				var $el = $(this);
				$el.closest('.js-form-group').find('input').prop('disabled', 'specified' != $el.data('value'));
			});

			$template.find('.macro-element').on('click', function() {
				var $el = $(this);
				var textarea = $template.find($el.data('target'));
				var endPos = textarea[0].selectionEnd;
				var str = textarea.val();
				textarea.val(str.substr(0, endPos) + "{{" + $el.data('macro') + '}}' + str.substr(endPos));
				textarea.focus();
			});

			$template.find('.body-tabs a').on('click', function(e) {
				e.preventDefault();
				$(this).tab('show');
			});

			$template.find('.js-preview-email-send').on('click', function() {
				var params = getFormattedFormData();
				var emailAddress = $template.find('#' + templateKeyword + '_preview_recipient').val();
				params.bcc.type = 'specified';
				params.bcc.email_addresses = [];
				params.to.type = "specified";
				params.to.email_addresses = [emailAddress];
				params.plain = $template.find('#' + templateKeyword + '_text_body').val();
				params.html = btoa($template.find('.wysiwyg-editor').cleanHtml());
				self.callApi({
					resource : 'whitelabel.previewNotification',
					data : {
						accountId : self.accountId,
						notificationId : templateKeyword,
						data : params
					},
					success : function(textStatus, products) {
						assert.success(monster.template(self, '!' + self.i18n.active().whitelabel.alertMessages.templatePreviewSuccess, {
							email_address : emailAddress
						}));
					}
				});
			});

			$template.find('.action-bar .restore').on('click', function() {
				monster.ui.confirm(self.i18n.active().whitelabel.templates.restoreWarning, function() {
					self.callApi({
						resource : 'whitelabel.deleteNotification',
						data : {
							accountId : self.accountId,
							notificationId : templateKeyword
						},
						success : function(textStatus, products) {
							self.whitelabelDataGet(function(data) {
								data.data.hidePasswordRecovery = false;
								self.whitelabelDataUpdate(data.data, function(data) {
									whitelabelData.doc = data.data;
								});
							});
							show(true);
							assert.success(self.i18n.active().whitelabel.alertMessages.templateRestoreSuccess);
						}
					});
				});
			});

			$template.find(".js-save").on("click", function() {
				if($switch.prop("checked")) {
					var item = getFormattedFormData();
					item.enabled = true;
					self.callApi({
						resource : "whitelabel.updateNotification",
						data : {
							accountId: self.accountId,
							notificationId: templateKeyword,
							data: item
						},
						success : function(textStatus, products) {
							self.callApi({
								resource : "whitelabel.updateNotificationHtml",
								data : {
									accountId : self.accountId,
									notificationId : templateKeyword,
									data : $template.find(".wysiwyg-editor").cleanHtml()
								},
								success : function(textStatus, products) {
									self.callApi({
										resource : "whitelabel.updateNotificationText",
										data : {
											accountId: self.accountId,
											notificationId: templateKeyword,
											data: $template.find('#' + templateKeyword + '_text_body').val()
										},
										success : function(textStatus, products) {
											show(true);
											assert.success(self.i18n.active().whitelabel.alertMessages.templateUpdateSuccess);
										}
									});
								}
							});
							if('password_recovery' === templateKeyword) {
								self.whitelabelDataGet(function(data) {
									data.data.hidePasswordRecovery = false;

									self.whitelabelDataUpdate(data.data, function(data) {
										whitelabelData.doc = data.data;
									});
								});
							}
						}
					});
				} else {
					if (templateData.data.enabled) {
						templateData.data.enabled = false;
						self.callApi({
							resource : 'whitelabel.updateNotification',
							data : {
								accountId: self.accountId,
								notificationId: templateKeyword,
								data: templateData.data
							},
							success : function(textStatus, products) {
								if('password_recovery' === templateKeyword) {
									self.whitelabelDataGet(function(response) {
										response.data.hidePasswordRecovery = true;
										self.whitelabelDataUpdate(response.data, function(data) {
											whitelabelData.doc = data.data;
										});
									});
								}
								show(true);
								assert.success(self.i18n.active().whitelabel.alertMessages.templateUpdateSuccess);
							}
						});
					}
				}
			});

			$template.find('.action-bar .cancel').on('click', function() {
				monster.ui.confirm(self.i18n.active().whitelabel.alertMessages.closeTemplateConfirm, function() {
					show();
				});
			});
		},

		whitelabelDataGet: function(callback) {
			var self = this;
			self.callApi({
				resource : 'whitelabel.get',
				data : {
					accountId: self.accountId,
					generateError: false
				},
				success : function(response) {
					if(typeof(callback) === 'function') {
						callback(response);
					}
				}
			});
		},

		whitelabelDataUpdate: function(data, callback) {
			var self = this;
			self.callApi({
				resource : 'whitelabel.update',
				data : {
					accountId : self.accountId,
					data : data.data,
					generateError: false
				},
				success : function(response) {
					if(typeof(callback) === 'function') {
						callback(response);
					}
				}
			});
		},

		menuSetActiveItem: function(screenKeyword) {
			$('.js-sidebar-menu-link')
				.removeClass('active')
				.filter('[data-screen="' + screenKeyword + '"]').addClass('active');
		},

		advancedScreenRender: function(data, $parent) {
			var self = this;

			self.menuSetActiveItem('advanced');

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
							monster.ui.alert('error', self.i18n.active().whitelabel.alertMessages.faviconWrongSize);
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
				monster.ui.confirm(data.i18n.active().whitelabel.alertMessages.deleteConfirm, function() {
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
