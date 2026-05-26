const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('GetOTB', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const config = {
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            server: process.env.SQL_SERVER, 
            database: process.env.SQL_DATABASE,
            options: { encrypt: true, trustServerCertificate: false }
        };

        try {
            let pool = await sql.connect(config);
            let result = await pool.request()
                .query('SELECT Division, Cat, Category, DeptID, ClassID, YR, MX, Sales, SalesLY, Units, UnitsLY, StockEOM, StockEOMLY, GM, GMLY, MKDN, MKDNLY, OnPO FROM OTB');
            
            // 1. Define the CSV Headers matching your database columns exactly
            const headers = [
                'Division', 'Cat', 'Category', 'DeptID', 'ClassID', 'YR', 'MX', 
                'Sales', 'SalesLY', 'Units', 'UnitsLY', 'StockEOM', 'StockEOMLY', 
                'GM', 'GMLY', 'MKDN', 'MKDNLY', 'OnPO'
            ];

            // Helper function to safely escape strings containing commas or quotes
            const escapeCSV = (val) => {
                if (val === null || val === undefined) return '';
                let str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    str = '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };

            // 2. Map through database records to create CSV rows
            const csvRows = result.recordset.map(row => {
                return headers.map(header => escapeCSV(row[header])).join(',');
            });

            // 3. Combine headers and rows with newlines
            const csvData = [headers.join(','), ...csvRows].join('\n');

            // 4. Return data as CSV string stream with correct content type
            return {
                status: 200,
                headers: { 
                    "Content-Type": "text/csv",
                    "Content-Disposition": "attachment; filename=MerchPlanDynamicCSV.csv"
                },
                body: csvData
            };
        } catch (err) {
            return {
                status: 500,
                headers: { "Content-Type": "text/plain" },
                body: "Database connection or CSV parsing error: " + err.message
            };
        }
    }
});
