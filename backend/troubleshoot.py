with open("C:/Users/Me/Documents/Final Year Project/multi-cloud-gnn/backend/sample_data/syslogs.log", "r", errors="ignore") as f:
 data = f.read()
 print(len(data), "characters")
print(data[:500])
