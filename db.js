const Store={
 key:'homeInventoryV2',
 blank(){return {version:2,products:{},transactions:[]}},
 load(){try{const d=JSON.parse(localStorage.getItem(this.key)||'null');return d&&d.products&&Array.isArray(d.transactions)?d:this.blank()}catch{return this.blank()}},
 save(d){localStorage.setItem(this.key,JSON.stringify(d))},
 clear(){localStorage.removeItem(this.key)}
};
