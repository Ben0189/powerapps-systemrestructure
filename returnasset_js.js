async function returnAsset(gridContext) {
    try {
        const recordIds = getSelectedRecordIds(gridContext);
        const updatePromises = []; // Array to collect all update promises

        for (const recordId of recordIds) {
            // Fetch and log the asset name for the current record ID
            const assetName = await fetchAssetName(recordId);
            console.log(`Fetched Asset Name for Record ID ${recordId}: ${assetName}`);

            // Open a dialog for each record ID individually
            const dialogResult = await openDialog(recordId, assetName);

            console.log(`Dialog Result for Record ID ${recordId}:`, dialogResult);

            if (dialogResult) {
                // Collect the update promise for each record
                const updatePromise = handleDialogSuccess(recordId, assetName, dialogResult);
                updatePromises.push(updatePromise);
            } else {
                console.log(`Dialog closed without returning data for Record ID: ${recordId}.`);
            }
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);
        console.log("All updates completed. Refreshing the grid...");

        // Refresh the grid after all updates are completed
        refreshGrid(gridContext);

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
 * Opens a dialog for a specific record ID and its asset name.
 * @param {string} recordId - The record ID to pass to the dialog.
 * @param {string} assetName - The asset name to pass to the dialog.
 * @returns {Promise} A promise that resolves with the dialog's return value.
 */
function openDialog(recordId, assetName) {
    const pageInput = {
        pageType: "webresource",
        webresourceName: "fgs_returnasset_status_dialog", // Your actual web resource name
        data: JSON.stringify({ recordId, assetName }) // Pass both recordId and assetName
    };

    const navigationOptions = {
        target: 2, // Open as a dialog
        width: 400,
        height: 300,
        position: 1, // Centered
        title: `Update Status for Asset: ${assetName}`
    };

    return Xrm.Navigation.navigateTo(pageInput, navigationOptions).catch((error) => {
        console.error(`Error opening dialog for Record ID ${recordId}:`, error);
        throw error;
    });
}

/**
 * Handles the success case when the dialog returns data for a specific asset.
 * Updates multiple columns in the fgs_projectasset table and the related Asset table.
 * @param {string} recordId - The record ID of the Project Asset to update.
 * @param {string} assetName - The Asset Name the dialog was for.
 * @param {Object} dialogResult - The data returned by the dialog.
 * @returns {Promise<void>} A promise that resolves when all updates are complete.
 */
async function handleDialogSuccess(recordId, assetName, dialogResult) {
    const selectedStatus = dialogResult.returnValue.selectedStatus;

    console.log(`Updating status for Asset: ${assetName}`);
    console.log(`Selected Status: ${selectedStatus}`);

    try {
        // Update multiple columns in the fgs_projectasset table
        const projectAssetUpdateData = {
            fgs_statusafterreturn: selectedStatus, // Logical name for the column
            fgs_assetassignmentstatus: 2, // Logical name for the "Returned" status
            fgs_returneddate: new Date().toISOString() // Current date and time in ISO format
        };

        console.log(`Updating fgs_projectasset for Record ID: ${recordId}`);
        await Xrm.WebApi.updateRecord("fgs_projectasset", recordId, projectAssetUpdateData);

        console.log(`Successfully updated fgs_projectasset for Asset: ${assetName}`);

        // Update the assetstatus in the related Asset table
        const assetId = await fetchAssetIdFromProjectAsset(recordId); // Get the related Asset ID
        if (assetId) {
            const assetUpdateData = {
                fgs_assetstatus: selectedStatus // Logical name for the column
            };

            console.log(`Updating assetstatus for Asset ID: ${assetId}`);
            await Xrm.WebApi.updateRecord("fgs_asset", assetId, assetUpdateData);

            console.log(`Successfully updated assetstatus for Asset: ${assetName}`);
        } else {
            console.warn(`No related Asset ID found for Project Asset ID: ${recordId}`);
        }

    } catch (error) {
        console.error(`Error updating status for Asset: ${assetName}`, error);
        throw error; // Ensure errors propagate back to the caller
    }
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

/**
 * Fetches the related Asset ID from the fgs_projectasset table using the Project Asset record ID.
 * @param {string} recordId - The record ID of the Project Asset.
 * @returns {Promise<string>} A promise that resolves to the related Asset ID.
 */
async function fetchAssetIdFromProjectAsset(recordId) {
    const navigationProperty = "fgs_Asset"; // Navigation property to the related Asset entity
    const assetIdField = "fgs_assetid"; // Field name for the Asset ID in the related entity

    try {
        const query = `?$select=${navigationProperty}&$expand=${navigationProperty}($select=${assetIdField})`;
        const projectAsset = await Xrm.WebApi.retrieveRecord("fgs_projectasset", recordId, query);

        const asset = projectAsset[navigationProperty];
        if (asset && asset[assetIdField]) {
            return asset[assetIdField];
        } else {
            console.warn(`No related Asset found for Project Asset ID: ${recordId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching related Asset ID for Project Asset ID: ${recordId}`, error);
        throw new Error(`Failed to fetch related Asset ID for Project Asset ID: ${recordId}`);
    }
}

/**
 * Refreshes the grid after updates.
 * @param {object} gridContext - The grid context object.
 */
function refreshGrid(gridContext) {
    try {
        gridContext.refresh(); // Refresh the grid in the current context
        console.log("Grid refreshed successfully.");
    } catch (error) {
        console.error("Error refreshing the grid:", error);
        Xrm.Navigation.openAlertDialog({
            text: "An error occurred while refreshing the grid. Please reload the page manually.",
            title: "Grid Refresh Error"
        });
    }
}