﻿$('#save-inventory-button').on('click', function(e)
{
	e.preventDefault();

	var jsonForm = $('#inventory-form').serializeJSON();
	Grocy.FrontendHelpers.BeginUiBusy("inventory-form");

	Grocy.Api.Get('stock/products/' + jsonForm.product_id,
		function(productDetails)
		{
			var jsonData = { };
			jsonData.new_amount = jsonForm.new_amount;
			jsonData.best_before_date = Grocy.Components.DateTimePicker.GetValue();
			jsonData.location_id = Grocy.Components.LocationPicker.GetValue();

			Grocy.Api.Post('stock/products/' + jsonForm.product_id + '/inventory', jsonData,
				function(result)
				{
					var addBarcode = GetUriParam('addbarcodetoselection');
					if (addBarcode !== undefined)
					{
						var existingBarcodes = productDetails.product.barcode || '';
						if (existingBarcodes.length === 0)
						{
							productDetails.product.barcode = addBarcode;
						}
						else
						{
							productDetails.product.barcode += ',' + addBarcode;
						}

						Grocy.Api.Put('objects/products/' + productDetails.product.id, productDetails.product,
							function (result) { },
							function(xhr)
							{
								console.error(xhr);
							}
						);
					}

					Grocy.FrontendHelpers.EndUiBusy("inventory-form");
					toastr.success(L('Stock amount of #1 is now #2 #3', productDetails.product.name, productDetails.stock_amount, Pluralize(productDetails.stock_amount, productDetails.quantity_unit_stock.name, productDetails.quantity_unit_stock.name_plural)) + '<br><a class="btn btn-secondary btn-sm mt-2" href="#" onclick="UndoStockBooking(' + result.id + ')"><i class="fas fa-undo"></i> ' + L("Undo") + '</a>');

					if (addBarcode !== undefined)
					{
						window.location.href = U('/inventory');
					}
					else
					{
						$('#inventory-change-info').addClass('d-none');
						$("#tare-weight-handling-info").addClass("d-none");
						$("#new_amount").attr("min", "0");
						$("#new_amount").attr("step", "1");
						$("#new_amount").parent().find(".invalid-feedback").text(L('The amount cannot be lower than #1', '0'));
						$('#new_amount').val('');
						$('#new_amount_qu_unit').text("");
						Grocy.Components.DateTimePicker.Clear();
						Grocy.Components.ProductPicker.SetValue('');
						Grocy.Components.ProductPicker.GetInputElement().focus();
						Grocy.FrontendHelpers.ValidateForm('inventory-form');
					}
				},
				function(xhr)
				{
					Grocy.FrontendHelpers.EndUiBusy("inventory-form");
					console.error(xhr);
				}
			);
		},
		function(xhr)
		{
			Grocy.FrontendHelpers.EndUiBusy("inventory-form");
			console.error(xhr);
		}
	);
});

Grocy.Components.ProductPicker.GetPicker().on('change', function(e)
{
	var productId = $(e.target).val();

	if (productId)
	{
		Grocy.Components.ProductCard.Refresh(productId);

		Grocy.Api.Get('stock/products/' + productId,
			function(productDetails)
			{
				$('#new_amount').attr('not-equal', productDetails.stock_amount);
				$('#new_amount_qu_unit').text(productDetails.quantity_unit_stock.name);

				if (productDetails.product.allow_partial_units_in_stock == 1)
				{
					$("#new_amount").attr("min", "0.01");
					$("#new_amount").attr("step", "0.01");
					$("#new_amount").parent().find(".invalid-feedback").text(L('The amount cannot be lower than #1', 0.01.toLocaleString()));
				}
				else
				{
					$("#new_amount").attr("min", "0");
					$("#new_amount").attr("step", "1");
					$("#new_amount").parent().find(".invalid-feedback").text(L('The amount cannot be lower than #1', '0'));
				}

				if (productDetails.product.enable_tare_weight_handling == 1)
				{
					$("#new_amount").attr("min", productDetails.product.tare_weight);
					$("#new_amount").parent().find(".invalid-feedback").text(L('The amount cannot be lower than #1', parseFloat(productDetails.product.tare_weight).toLocaleString({ minimumFractionDigits: 0, maximumFractionDigits: 2 })));
					$("#tare-weight-handling-info").removeClass("d-none");
				}
				else
				{
					$("#tare-weight-handling-info").addClass("d-none");
				}

				Grocy.Components.LocationPicker.SetId(productDetails.location.id);
				$('#new_amount').focus();
			},
			function(xhr)
			{
				console.error(xhr);
			}
		);
	}
});

$('#new_amount').val('');
Grocy.FrontendHelpers.ValidateForm('inventory-form');

if (Grocy.Components.ProductPicker.InProductAddWorkflow() === false)
{
	Grocy.Components.ProductPicker.GetInputElement().focus();
}
else
{
	Grocy.Components.ProductPicker.GetPicker().trigger('change');
}

$('#new_amount').on('focus', function(e)
{
	if (Grocy.Components.ProductPicker.GetValue().length === 0)
	{
		Grocy.Components.ProductPicker.GetInputElement().focus();
	}
	else
	{
		$(this).select();
	}
});

$('#inventory-form input').keyup(function (event)
{
	Grocy.FrontendHelpers.ValidateForm('inventory-form');
});

$('#inventory-form input').keydown(function(event)
{
	if (event.keyCode === 13) //Enter
	{
		event.preventDefault();

		if (document.getElementById('inventory-form').checkValidity() === false) //There is at least one validation error
		{
			return false;
		}
		else
		{
			$('#save-inventory-button').click();
		}
	}
});

$('#new_amount').on('keypress', function(e)
{
	$('#new_amount').trigger('change');
});

Grocy.Components.DateTimePicker.GetInputElement().on('change', function(e)
{
	Grocy.FrontendHelpers.ValidateForm('inventory-form');
});

Grocy.Components.DateTimePicker.GetInputElement().on('keypress', function(e)
{
	Grocy.FrontendHelpers.ValidateForm('inventory-form');
});

$('#new_amount').on('keyup', function(e)
{
	var productId = Grocy.Components.ProductPicker.GetValue();
	var newAmount = parseInt($('#new_amount').val());

	if (productId)
	{
		Grocy.Api.Get('stock/products/' + productId,
			function(productDetails)
			{
				var productStockAmount = parseFloat(productDetails.stock_amount || parseFloat('0'));
				
				var containerWeight = parseFloat("0");
				if (productDetails.product.enable_tare_weight_handling == 1)
				{
					containerWeight = parseFloat(productDetails.product.tare_weight);
				}

				var estimatedBookingAmount = Math.abs(newAmount - productStockAmount - containerWeight);
				$('#inventory-change-info').removeClass('d-none');

				if (productDetails.product.enable_tare_weight_handling == 1 && newAmount < containerWeight)
				{
					$('#inventory-change-info').addClass('d-none');
				}
				else if (newAmount > productStockAmount + containerWeight)
				{
					$('#inventory-change-info').text(L('This means #1 will be added to stock', estimatedBookingAmount.toLocaleString() + ' ' + Pluralize(estimatedBookingAmount, productDetails.quantity_unit_stock.name, productDetails.quantity_unit_stock.name_plural)));
					Grocy.Components.DateTimePicker.GetInputElement().attr('required', '');
					Grocy.Components.LocationPicker.GetInputElement().attr('required', '');
				}
				else if (newAmount < productStockAmount + containerWeight)
				{
					$('#inventory-change-info').text(L('This means #1 will be removed from stock', estimatedBookingAmount.toLocaleString() + ' ' + Pluralize(estimatedBookingAmount, productDetails.quantity_unit_stock.name, productDetails.quantity_unit_stock.name_plural)));
					Grocy.Components.DateTimePicker.GetInputElement().removeAttr('required');
					Grocy.Components.LocationPicker.GetInputElement().removeAttr('required');
				}

				Grocy.FrontendHelpers.ValidateForm('inventory-form');
			},
			function(xhr)
			{
				console.error(xhr);
			}
		);
	}
});

function UndoStockBooking(bookingId)
{
	Grocy.Api.Post('stock/bookings/' + bookingId.toString() + '/undo', { },
		function(result)
		{
			toastr.success(L("Booking successfully undone"));
		},
		function(xhr)
		{
			console.error(xhr);
		}
	);
};
