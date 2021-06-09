import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { Role } from "@pulumi/aws/iam";
import { Subnet } from "@pulumi/aws/ec2";
import { output, Output } from "@pulumi/pulumi";

// Create an AWS resource (S3 Bucket)


const bucket = new aws.s3.Bucket("msoni-pulumi", {
    acl: "private",
});

// Export the name of the bucket
export const bucketName = pulumi.interpolate`${bucket.id}`;


const examplebucketObject = new aws.s3.BucketObject("myobject", {
    key: "index.html",
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset("index.html"),
});

// const bootstrapScript = aws.s3.getBucketObject({
//     bucket: bucket.id,
//     key: "ec2-bootstrap-script.sh",
// });




const myVpc = new aws.ec2.Vpc("msoniVpc", {
    cidrBlock: "172.16.0.0/16",
    tags: {
        Name: "msoniVpc",
    },
});
const mySubnet1 = new aws.ec2.Subnet("msoniSubnet1", {
    vpcId: myVpc.id,
    cidrBlock: "172.16.0.0/24",
    availabilityZone: "us-east-1a",
    mapPublicIpOnLaunch:true,
    tags: {
        Name: "msoniSubnet1",
    },
});

const mySubnet2 = new aws.ec2.Subnet("msoniSubnet2", {
    vpcId: myVpc.id,
    cidrBlock: "172.16.1.0/24",
    availabilityZone: "us-east-1b",
    mapPublicIpOnLaunch:true,
    tags: {
        Name: "msoniSubnet2",
    },
});




const gw = new aws.ec2.InternetGateway("msoni-gw", {
    vpcId: myVpc.id,
    tags: {
        Name: "msoni-gw",
    },
});

const routetable = new aws.ec2.RouteTable("msoni-rt", {
    vpcId: myVpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: gw.id,
        },
    ],
    tags: {
        Name: "msoni-rt",
    },
});


const routeTableAssociation1 = new aws.ec2.RouteTableAssociation("routeTableAssociation1", {
    subnetId: mySubnet1.id,
    routeTableId: routetable.id,
});


const routeTableAssociation2 = new aws.ec2.RouteTableAssociation("routeTableAssociation2", {
    subnetId: mySubnet2.id,
    routeTableId: routetable.id,
});






// const userData = 
// `#!/bin/bash
// sudo apt update -y
// sudo apt install -y apache2 && sudo apt install -y awscli 
// aws s3 cp s3://`+pulumi.interpolate`${bucket.id}`+`/index.html /var/www/html/index.html
// sudo systemctl start apache2`;


const userData = pulumi.interpolate`#!/bin/bash
sudo apt update -y
sudo apt install -y apache2 && sudo apt install -y awscli 
aws s3 cp s3://${bucket.id}/index.html /var/www/html/index.html
sudo systemctl start apache2`;


//echo "it works" > /var/www/html/index.html
//msoni-pulumi-bba471c


const size = "t2.micro"; 

const key = new aws.ec2.KeyPair("msoni-key", {
    publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC+iaLTxQw3AUAqTE8HOiU/3D4hH6lqzyJQY5sj5C3oAHTXJyQaSHDwxGtuvkknFUFFgunOZOVgY3bpCqBRco6AJ78EhSVT9jMO6evS5T0/I1DKxjlbyRYnbxhzoewEX8ZCu05eMBXaU/86W/uzblZ551xrMqfdDCb0FISddxIB94vtsIrigNl1kR6KiBy1AJYzWmpfr4UpZ0cC3Zhfp7+dujrPlO3YWlppzNj66aROnJIeSQeiIM1iQ4OC1O/5Ety2QrJvQxfn7yIIWwdyP/drEHzygO2yQwfDz7Z6eeenb4gLZioxQwX5hNu2qG2x3jP1dM0MTNrdUX2TLPWFkrBd5a5AADvdGqAqcERnxEYU8qLsZdvTgXy5WkIkaqQvogxyKBU5KBWERjQQS0V0r2q1+t+c0siuZvDSzNrsfe7HaCVsDW+zOZIKs6bkhHRF95Lm8358gPyXFlsse4Xqb3ZqYHJICFZ6WX8g8oeYjkFFEs4CjjwWpuIFE0k4onT2YSs= manishsoni@C02FFAWTMD6M-manishsoni",
});

const lb_sg = new aws.ec2.SecurityGroup("lb-sg", {
    vpcId: myVpc.id,
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
    }],
});



const group = new aws.ec2.SecurityGroup("web-sg", {
    vpcId: myVpc.id,
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
    }],
});

const server1 = new aws.ec2.Instance("web1", {
    instanceType: size,
    vpcSecurityGroupIds: [ group.id ], // reference the security group resource above
    ami: "ami-0747bdcabd34c712a",
    iamInstanceProfile: "s3-full-access-role",
    subnetId: mySubnet1.id,
    associatePublicIpAddress: true,
    userData: userData,
    keyName: key.id,
    tags: {
        Name: "msoni-web-1",
    },
});



const server2 = new aws.ec2.Instance("web2", {
    instanceType: size,
    vpcSecurityGroupIds: [ group.id ], // reference the security group resource above
    ami: "ami-0747bdcabd34c712a",
    iamInstanceProfile: "s3-full-access-role",
    subnetId: mySubnet2.id,
    associatePublicIpAddress: true,
    userData: userData,
    keyName: key.id,
    tags: {
        Name: "msoni-web-2",
    },
});




const alb = new aws.lb.LoadBalancer("myalb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [lb_sg.id],
    subnets: [mySubnet1.id, mySubnet2.id],
    enableDeletionProtection: false,
    tags: {
        Name: "msoni-alb",
    },
});


const targetgroup = new aws.lb.TargetGroup("msoni-tg", {
    port: 80,
    protocol: "HTTP",
    vpcId: myVpc.id,
    tags: {
        Name: "msoni-tg",
    },
});

const testTargetGroupAttachment = new aws.lb.TargetGroupAttachment("testTargetGroupAttachment", {
    targetGroupArn: targetgroup.arn,
    targetId: server1.id,
    port: 80,
});

const testTargetGroupAttachment2 = new aws.lb.TargetGroupAttachment("testTargetGroupAttachment2", {
    targetGroupArn: targetgroup.arn,
    targetId: server2.id,
    port: 80,
});


const Listener = new aws.lb.Listener("Listener", {
    loadBalancerArn: alb.arn,
    protocol: "HTTP",
    port: 80,
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetgroup.arn,
    }],
});

