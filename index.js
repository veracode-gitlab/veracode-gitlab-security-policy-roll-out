const axios = require('axios');
require('dotenv').config();

// Define the endpoint and your GitLab access token
const endpoint = process.env.GITLAB_URL + '/api/graphql';
const token = process.env.GITLAB_ACCESS_TOKEN;

const mutation = `
  mutation SecurityPolicyProjectAssign($fullPath: String!, $securityPolicyProjectId: ProjectID!) {
    securityPolicyProjectAssign(
      input: { fullPath: $fullPath, securityPolicyProjectId: $securityPolicyProjectId }
    ) {
      clientMutationId
      errors
    }
  }
`;

const securityPolicyProjectId = process.env.SECURITY_POLICY_PROJECT_ID;
if (!securityPolicyProjectId) {
  console.error("Error: SECURITY_POLICY_PROJECT_ID environment variable is not set. Please provide the security policy project ID.");
  process.exit(1); // Exit the script with an error code
}

const groupsQuery = `
  query {
    groups {
      nodes {
        fullPath
      }
    }
  }
`;

// Function to fetch all groups
async function fetchAllGroups() {
  try {
    const response = await axios.post(endpoint, {
      query: groupsQuery
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.data.groups.nodes.map(group => group.fullPath);
  } catch (error) {
    console.error('Error fetching groups:', error.response?.data || error.message);
    throw error; // Re-throw the error to handle it at a higher level if needed
  }
}

// Execute the request using async/await
async function assignSecurityPolicyToProject(fullPath) {
  try {
    const response = await axios.post(endpoint, {
      query: mutation,
      variables: {
        fullPath: fullPath,
        securityPolicyProjectId: securityPolicyProjectId
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.data.securityPolicyProjectAssign.errors.length > 0) {
      console.error(`Error assigning policy to ${fullPath}:`, response.data.data.securityPolicyProjectAssign.errors);
    } else {
      console.log(`Policy assigned to ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error assigning policy to ${fullPath}:`, error.response?.data || error.message);
  }
}

async function main() {
  try {
    const allGroups = await fetchAllGroups();

    // Assign the policy to each group concurrently (adjust if needed)
    await Promise.all(allGroups.map(assignSecurityPolicyToProject));

    console.log('Policy assignment complete!');
  } catch (error) {
    console.error('An error occurred during policy assignment:', error);
  }
}

// Start the process
main();