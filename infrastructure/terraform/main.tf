# ===========================================
# MANIPULA PLATFORM - AWS INFRASTRUCTURE
# ===========================================

terraform {
  required_version = ">= 1.6"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "manipula-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "manipula-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Manipula"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ===========================================
# VARIABLES
# ===========================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 100
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "eks_cluster_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.28"
}

variable "domain_name" {
  description = "Domain name for the platform"
  type        = string
  default     = "manipula.dev"
}

# ===========================================
# VPC & NETWORKING
# ===========================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "manipula-vpc-${var.environment}"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# ===========================================
# RDS POSTGRESQL
# ===========================================

resource "aws_db_subnet_group" "main" {
  name       = "manipula-db-subnet-${var.environment}"
  subnet_ids = module.vpc.database_subnets

  tags = {
    Name = "Manipula DB subnet group"
  }
}

resource "aws_security_group" "rds" {
  name        = "manipula-rds-${var.environment}"
  description = "Security group for Manipula RDS"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "manipula-rds-sg"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "manipula-${var.environment}"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "manipula"
  username = "manipula"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = var.environment == "production"
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  performance_insights_enabled = true

  tags = {
    Name = "manipula-postgres"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# ===========================================
# ELASTICACHE REDIS
# ===========================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "manipula-cache-subnet-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "elasticache" {
  name        = "manipula-elasticache-${var.environment}"
  description = "Security group for Manipula ElastiCache"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "manipula-elasticache-sg"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "manipula-${var.environment}"
  replication_group_description = "Manipula Redis cluster"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.elasticache_node_type
  number_cache_clusters = var.environment == "production" ? 2 : 1
  parameter_group_name = "default.redis7"

  port = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 5
  snapshot_window         = "03:00-04:00"

  tags = {
    Name = "manipula-redis"
  }
}

# ===========================================
# EKS CLUSTER
# ===========================================

resource "aws_security_group" "eks_nodes" {
  name        = "manipula-eks-nodes-${var.environment}"
  description = "Security group for EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "manipula-eks-nodes-sg"
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "manipula-${var.environment}"
  cluster_version = var.eks_cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 10

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "general"
      }
    }

    agents = {
      desired_size = 2
      min_size     = 1
      max_size     = 5

      instance_types = ["t3.xlarge"]
      capacity_type  = "SPOT"

      labels = {
        role = "agents"
      }

      taints = [{
        key    = "workload"
        value  = "agents"
        effect = "NoSchedule"
      }]
    }
  }

  tags = {
    Name = "manipula-eks"
  }
}

# ===========================================
# S3 BUCKETS
# ===========================================

resource "aws_s3_bucket" "artifacts" {
  bucket = "manipula-artifacts-${var.environment}"

  tags = {
    Name = "Manipula Artifacts"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ===========================================
# OUTPUTS
# ===========================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_password" {
  description = "RDS password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "s3_artifacts_bucket" {
  description = "S3 artifacts bucket name"
  value       = aws_s3_bucket.artifacts.id
}
