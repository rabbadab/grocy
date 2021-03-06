﻿var recipesTables = $('#recipes-table').DataTable({
	'paginate': false,
	'order': [[0, 'asc']],
	'columnDefs': [
		{ 'orderData': 2, 'targets': 1 }
	],
	'language': JSON.parse(L('datatables_localization')),
	'scrollY': false,
	'colReorder': true,
	'stateSave': true,
	'stateSaveParams': function(settings, data)
	{
		data.search.search = "";

		data.columns.forEach(column =>
		{
			column.search.search = "";
		});
	},
	'select': 'single',
	'initComplete': function()
	{
		this.api().row({ order: 'current' }, 0).select();
	}
});
$('#recipes-table tbody').removeClass("d-none");
recipesTables.columns.adjust().draw();

if ((typeof GetUriParam("tab") !== "undefined" && GetUriParam("tab") === "gallery") || window.localStorage.getItem("recipes_last_tab_id") == "gallery-tab")
{
	$(".nav-tabs a[href='#gallery']").tab("show");
}

var recipe = GetUriParam("recipe");
if (typeof recipe !== "undefined")
{
	$("#recipes-table tr").removeClass("selected");
	var rowId = "#recipe-row-" + recipe;
	$(rowId).addClass("selected")

	var cardId = "#recipe-card-" + recipe;
	$(cardId).addClass("bg-primary").addClass("text-white");
	$(cardId)[0].scrollIntoView();
}

$("a[data-toggle='tab']").on("shown.bs.tab", function(e)
{
	var tabId = $(e.target).attr("id");
	window.localStorage.setItem("recipes_last_tab_id", tabId);
});

$("#search").on("keyup", function()
{
	var value = $(this).val();

	recipesTables.search(value).draw();

	$(".recipe-gallery-item-container").removeClass("d-none");
	$(".recipe-gallery-item-container .card-title:not(:contains_case_insensitive(" + value + "))").parent().parent().parent().parent().addClass("d-none");
});

$("#selectedRecipeDeleteButton").on('click', function(e)
{
	var objectName = $(e.currentTarget).attr('data-recipe-name');
	var objectId = $(e.currentTarget).attr('data-recipe-id');

	bootbox.confirm({
		message: L('Are you sure to delete recipe "#1"?', objectName),
		buttons: {
			confirm: {
				label: L('Yes'),
				className: 'btn-success'
			},
			cancel: {
				label: L('No'),
				className: 'btn-danger'
			}
		},
		callback: function(result)
		{
			if (result === true)
			{
				Grocy.Api.Delete('objects/recipes/' + objectId, {},
					function(result)
					{
						window.location.href = U('/recipes');
					},
					function(xhr)
					{
						console.error(xhr);
					}
				);
			}
		}
	});
});

$(document).on('click', '.recipe-order-missing-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-recipe-name');
	var objectId = $(e.currentTarget).attr('data-recipe-id');

	bootbox.confirm({
		message: L('Are you sure to put all missing ingredients for recipe "#1" on the shopping list?', objectName) + "<br><br>" + L("Uncheck ingredients to not put them on the shopping list") + ":" + $("#missing-recipe-pos-list")[0].outerHTML.replace("d-none", ""),
		buttons: {
			confirm: {
				label: L('Yes'),
				className: 'btn-success'
			},
			cancel: {
				label: L('No'),
				className: 'btn-danger'
			}
		},
		callback: function(result)
		{
			if (result === true)
			{
				Grocy.FrontendHelpers.BeginUiBusy();

				var excludedProductIds = new Array();
				$(".missing-recipe-pos-product-checkbox:checkbox:not(:checked)").each(function()
				{
					excludedProductIds.push($(this).data("product-id"));
				});

				Grocy.Api.Post('recipes/' + objectId + '/add-not-fulfilled-products-to-shoppinglist', { "excludedProductIds": excludedProductIds },
					function(result)
					{
						window.location.href = U('/recipes');
					},
					function(xhr)
					{
						Grocy.FrontendHelpers.EndUiBusy();
						console.error(xhr);
					}
				);
			}
		}
	});
});

$("#selectedRecipeConsumeButton").on('click', function(e)
{
	var objectName = $(e.currentTarget).attr('data-recipe-name');
	var objectId = $(e.currentTarget).attr('data-recipe-id');

	bootbox.confirm({
		message: L('Are you sure to consume all ingredients needed by recipe "#1" (ingredients marked with "check only if a single unit is in stock" will be ignored)?', objectName),
		buttons: {
			confirm: {
				label: L('Yes'),
				className: 'btn-success'
			},
			cancel: {
				label: L('No'),
				className: 'btn-danger'
			}
		},
		callback: function(result)
		{
			if (result === true)
			{
				Grocy.FrontendHelpers.BeginUiBusy();

				Grocy.Api.Post('recipes/' + objectId + '/consume', { },
					function(result)
					{
						Grocy.FrontendHelpers.EndUiBusy();
						toastr.success(L('Removed all ingredients of recipe "#1" from stock', objectName));
					},
					function(xhr)
					{
						Grocy.FrontendHelpers.EndUiBusy();
						console.error(xhr);
					}
				);
			}
		}
	});
});

recipesTables.on('select', function(e, dt, type, indexes)
{
	if (type === 'row')
	{
		var selectedRecipeId = $(recipesTables.row(indexes[0]).node()).data("recipe-id");
		window.location.href = U('/recipes?recipe=' + selectedRecipeId.toString());
	}
});

$(".recipe-gallery-item").on("click", function(e)
{
	e.preventDefault();

	window.location.href = U('/recipes?tab=gallery&recipe=' + $(this).data("recipe-id"));
});

$("#selectedRecipeToggleFullscreenButton").on('click', function(e)
{
	e.preventDefault();

	$("#selectedRecipeCard").toggleClass("fullscreen");
	$("body").toggleClass("fullscreen-card");
	$("#selectedRecipeCard .card-header").toggleClass("fixed-top");
	$("#selectedRecipeCard .card-body").toggleClass("mt-5");

	window.location.hash = "fullscreen";
});

$('#servings-scale').keyup(function(event)
{
	var data = { };
	data.desired_servings = $(this).val();

	Grocy.Api.Put('objects/recipes/' + $(this).data("recipe-id"), data,
		function(result)
		{
			window.location.reload();
		},
		function(xhr)
		{
			console.error(xhr);
		}
	);
});

$(document).on("click", ".missing-recipe-pos-select-button", function(e)
{
	e.preventDefault();

	var checkbox = $(this).find(".form-check-input");
	checkbox.prop("checked", !checkbox.prop("checked"));

	$(this).toggleClass("list-group-item-primary");
});

if (window.location.hash === "#fullscreen")
{
	$("#selectedRecipeToggleFullscreenButton").click();
}
