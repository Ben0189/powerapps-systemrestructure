async function returnAsset(gridContext) {
    try {
        const recordIds = getSelectedRecordIds(gridContext);
        for (const recordId of recordIds) {
            // Fetch and log the asset name for the current record ID
            const assetName = await fetchAssetName(recordId);
            console.log(`Fetched Asset Name for Record ID ${recordId}: ${assetName}`);
        }
        const dialogResult = await openDialog(recordIds);
        console.log("Dialog Result:", dialogResult);
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

/**
 * Fetches the Asset Name from the related Asset entity using the Project Asset record ID.
 * @param {string} recordId - The record ID of the Project Asset.
 * @returns {Promise<string>} A promise that resolves to the Asset Name.
 */
async function fetchAssetName(recordId) {
    const projectAssetEntityName = "fgs_projectasset"; // Logical name of the Project Asset entity
    const navigationProperty = "fgs_Asset"; // Navigation property to the related Asset entity
    const assetNameField = "fgs_name"; // Field name for the Asset Name in the Asset entity

    try {
        // Build the query to retrieve the Project Asset and expand the related Asset entity
        const query = `?$select=${navigationProperty}&$expand=${navigationProperty}($select=${assetNameField})`;

        // Retrieve the Project Asset record
        const projectAsset = await Xrm.WebApi.retrieveRecord(projectAssetEntityName, recordId, query);

        // Extract the Asset Name from the expanded related entity
        const asset = projectAsset[navigationProperty];
        if (asset && asset[assetNameField]) {
            return asset[assetNameField];
        } else {
            throw new Error("Asset Name not found.");
        }
    } catch (error) {
        console.error(`Error fetching Asset Name for Project Asset ID: ${recordId}`, error);
        throw new Error(`Failed to fetch Asset Name for Project Asset ID: ${recordId}`);
    }
}