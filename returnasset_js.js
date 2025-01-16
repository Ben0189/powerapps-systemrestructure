async function returnAsset(gridContext) {
    try {
        const recordIds = getSelectedRecordIds(gridContext);
        const dialogResult = await openDialog(recordIds);

        if (dialogResult) {
            handleDialogSuccess(dialogResult);
        } else {
            console.log("Dialog closed without returning data.");
        }
    } catch (error) {
        handleError(error);
    }
}

/**
 * Extracts selected record IDs from the grid context.
 * @param {object} gridContext - The grid context object.
 * @returns {Array} Array of selected record IDs.
 */
function getSelectedRecordIds(gridContext) {
    const selectedRowsObj = gridContext.getGrid().getSelectedRows();
    const selectedRows = selectedRowsObj._collection;

    console.log("Selected Rows:", selectedRows);

    if (!selectedRows || Object.keys(selectedRows).length === 0) {
        throw new Error("No assets selected. Please select at least one asset to return.");
    }

    const recordIds = Object.values(selectedRows).map((row) => row._entityId.guid);
    console.log("Record IDs:", recordIds);
    return recordIds;
}

/**
 * Opens a dialog with the given record IDs.
 * @param {Array} recordIds - The record IDs to pass to the dialog.
 * @returns {Promise} A promise that resolves with the dialog's return value.
 */
function openDialog(recordIds) {
    const pageInput = {
        pageType: "webresource",
        webresourceName: "fgs_returnasset_status_dialog", // Your actual web resource name
        data: JSON.stringify(recordIds) // Pass record IDs as a string
    };

    const navigationOptions = {
        target: 2, // Open as a dialog
        width: 400,
        height: 300,
        position: 1, // Centered
        title: "Update Asset Status"
    };

    return Xrm.Navigation.navigateTo(pageInput, navigationOptions).catch((error) => {
        console.error("Error opening dialog:", error);
        throw error;
    });
}

/**
 * Handles the success case when the dialog returns data.
 * @param {Object} dialogResult - The data returned by the dialog.
 */
function handleDialogSuccess(dialogResult) {
    console.log("Returned Value:", dialogResult);

    Xrm.Navigation.openAlertDialog({
        text: `Selected Status: ${dialogResult.returnValue.selectedStatus}\nRecord IDs: ${dialogResult.returnValue.recordId}`,
        title: "Success"
    });
}

/**
 * Handles errors in the overall process.
 * @param {Error} error - The error to handle.
 */
function handleError(error) {
    Xrm.Navigation.openAlertDialog({
        text: `An error occurred: ${error.message}`,
        title: "Error"
    });
    console.error("Error in returnAsset function:", error);
}
