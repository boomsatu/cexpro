const { sequelize } = require('../src/config/database');
const models = require('../src/models');
const { QueryInterface } = require('sequelize');

/**
 * Script untuk memverifikasi dan memperbaiki inkonsistensi antara model Sequelize dan schema database
 */
class DatabaseSchemaVerifier {
  constructor() {
    this.queryInterface = sequelize.getQueryInterface();
    this.issues = [];
  }

  async verifyAllModels() {
    console.log('🔍 Memverifikasi konsistensi schema database...');
    
    const modelNames = Object.keys(models).filter(key => 
      typeof models[key] === 'object' && 
      models[key].tableName && 
      key !== 'sequelize' && 
      typeof models[key].sync === 'function'
    );

    for (const modelName of modelNames) {
      await this.verifyModel(modelName, models[modelName]);
    }

    return this.issues;
  }

  async verifyModel(modelName, model) {
    try {
      console.log(`\n📋 Memeriksa model: ${modelName}`);
      
      const tableName = model.tableName;
      const modelAttributes = model.rawAttributes;
      
      // Dapatkan kolom dari database
      const tableColumns = await this.getTableColumns(tableName);
      
      // Periksa kolom yang hilang di database
      await this.checkMissingColumns(modelName, tableName, modelAttributes, tableColumns);
      
      // Periksa kolom yang tidak digunakan di model
      await this.checkUnusedColumns(modelName, tableName, modelAttributes, tableColumns);
      
      // Periksa tipe data yang tidak cocok
      await this.checkDataTypeMismatch(modelName, tableName, modelAttributes, tableColumns);
      
    } catch (error) {
      console.error(`❌ Error saat memeriksa model ${modelName}:`, error.message);
      this.issues.push({
        type: 'error',
        model: modelName,
        message: `Error: ${error.message}`
      });
    }
  }

  async getTableColumns(tableName) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      return results.reduce((acc, col) => {
        acc[col.column_name] = col;
        return acc;
      }, {});
    } catch (error) {
      console.warn(`⚠️  Tabel ${tableName} tidak ditemukan di database`);
      return {};
    }
  }

  async checkMissingColumns(modelName, tableName, modelAttributes, tableColumns) {
    const missingColumns = [];
    
    for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
      // Skip kolom virtual dan asosiasi
      if (attrDef.type && attrDef.type.key !== 'VIRTUAL') {
        const columnName = attrDef.field || attrName;
        
        if (!tableColumns[columnName]) {
          missingColumns.push({
            attribute: attrName,
            column: columnName,
            type: attrDef.type,
            allowNull: attrDef.allowNull !== false
          });
        }
      }
    }

    if (missingColumns.length > 0) {
      console.log(`❌ Kolom yang hilang di tabel ${tableName}:`);
      missingColumns.forEach(col => {
        console.log(`   - ${col.column} (${col.type})`);
      });
      
      this.issues.push({
        type: 'missing_columns',
        model: modelName,
        table: tableName,
        columns: missingColumns
      });
    }
  }

  async checkUnusedColumns(modelName, tableName, modelAttributes, tableColumns) {
    const unusedColumns = [];
    const modelColumnNames = new Set();
    
    // Kumpulkan semua nama kolom dari model
    for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
      if (attrDef.type && attrDef.type.key !== 'VIRTUAL') {
        const columnName = attrDef.field || attrName;
        modelColumnNames.add(columnName);
      }
    }
    
    // Tambahkan kolom timestamp default
    modelColumnNames.add('created_at');
    modelColumnNames.add('updated_at');
    
    for (const columnName of Object.keys(tableColumns)) {
      if (!modelColumnNames.has(columnName)) {
        unusedColumns.push(columnName);
      }
    }

    if (unusedColumns.length > 0) {
      console.log(`⚠️  Kolom yang tidak digunakan di tabel ${tableName}:`);
      unusedColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      
      this.issues.push({
        type: 'unused_columns',
        model: modelName,
        table: tableName,
        columns: unusedColumns
      });
    }
  }

  async checkDataTypeMismatch(modelName, tableName, modelAttributes, tableColumns) {
    const mismatches = [];
    
    for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
      if (attrDef.type && attrDef.type.key !== 'VIRTUAL') {
        const columnName = attrDef.field || attrName;
        const dbColumn = tableColumns[columnName];
        
        if (dbColumn) {
          const sequelizeType = this.getSequelizeTypeString(attrDef.type);
          const dbType = dbColumn.data_type;
          
          if (!this.isCompatibleType(sequelizeType, dbType)) {
            mismatches.push({
              column: columnName,
              modelType: sequelizeType,
              dbType: dbType
            });
          }
        }
      }
    }

    if (mismatches.length > 0) {
      console.log(`⚠️  Ketidakcocokan tipe data di tabel ${tableName}:`);
      mismatches.forEach(mismatch => {
        console.log(`   - ${mismatch.column}: Model(${mismatch.modelType}) vs DB(${mismatch.dbType})`);
      });
      
      this.issues.push({
        type: 'type_mismatch',
        model: modelName,
        table: tableName,
        mismatches: mismatches
      });
    }
  }

  getSequelizeTypeString(type) {
    if (typeof type === 'string') return type;
    if (type.key) return type.key;
    return type.toString();
  }

  isCompatibleType(sequelizeType, dbType) {
    const typeMap = {
      'UUID': ['uuid'],
      'STRING': ['character varying', 'text', 'varchar'],
      'TEXT': ['text'],
      'INTEGER': ['integer', 'int4'],
      'BIGINT': ['bigint', 'int8'],
      'DECIMAL': ['numeric', 'decimal'],
      'FLOAT': ['real', 'float4'],
      'DOUBLE': ['double precision', 'float8'],
      'BOOLEAN': ['boolean', 'bool'],
      'DATE': ['timestamp with time zone', 'timestamptz'],
      'DATEONLY': ['date'],
      'ENUM': ['USER-DEFINED'],
      'JSONB': ['jsonb'],
      'JSON': ['json']
    };
    
    const compatibleTypes = typeMap[sequelizeType] || [];
    return compatibleTypes.includes(dbType.toLowerCase());
  }

  async generateFixScript() {
    if (this.issues.length === 0) {
      console.log('\n✅ Tidak ada masalah yang ditemukan!');
      return;
    }

    console.log('\n📝 Membuat script perbaikan...');
    
    let fixScript = '-- Script perbaikan database schema\n\n';
    
    for (const issue of this.issues) {
      if (issue.type === 'missing_columns') {
        fixScript += `-- Menambahkan kolom yang hilang untuk tabel ${issue.table}\n`;
        
        for (const col of issue.columns) {
          const sqlType = this.getSQLType(col.type);
          const nullable = col.allowNull ? '' : ' NOT NULL';
          
          fixScript += `ALTER TABLE ${issue.table} ADD COLUMN ${col.column} ${sqlType}${nullable};\n`;
        }
        
        fixScript += '\n';
      }
    }
    
    console.log('\n📄 Script perbaikan:');
    console.log(fixScript);
    
    return fixScript;
  }

  getSQLType(sequelizeType) {
    const typeString = this.getSequelizeTypeString(sequelizeType);
    
    const typeMap = {
      'UUID': 'UUID',
      'STRING': 'VARCHAR(255)',
      'TEXT': 'TEXT',
      'INTEGER': 'INTEGER',
      'BIGINT': 'BIGINT',
      'DECIMAL': 'NUMERIC(36,18)',
      'FLOAT': 'REAL',
      'DOUBLE': 'DOUBLE PRECISION',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'TIMESTAMP WITH TIME ZONE',
      'DATEONLY': 'DATE',
      'JSONB': 'JSONB',
      'JSON': 'JSON'
    };
    
    return typeMap[typeString] || 'TEXT';
  }

  printSummary() {
    console.log('\n📊 Ringkasan Verifikasi:');
    console.log(`Total masalah ditemukan: ${this.issues.length}`);
    
    const issueTypes = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    for (const [type, count] of Object.entries(issueTypes)) {
      console.log(`- ${type}: ${count}`);
    }
  }
}

// Jalankan verifikasi jika script dipanggil langsung
if (require.main === module) {
  (async () => {
    try {
      const verifier = new DatabaseSchemaVerifier();
      
      await verifier.verifyAllModels();
      verifier.printSummary();
      await verifier.generateFixScript();
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error saat verifikasi:', error);
      process.exit(1);
    }
  })();
}

module.exports = DatabaseSchemaVerifier;