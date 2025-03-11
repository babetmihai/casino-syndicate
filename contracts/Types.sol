	struct TableMember {
		address id;
		uint256 tableId;
		uint256 amount;
		address createdBy;
		uint256 createdAt;
		uint256 updatedAt;
	}	

	struct Table {
		uint256 id;
		string name;
		address createdBy;
		uint256 createdAt;
		uint256 updatedAt;
	}